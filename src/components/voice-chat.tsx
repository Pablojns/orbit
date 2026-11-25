"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type QuickState, quickText } from "@/app/app/actions";
import { Modal, ModalHeader } from "./modal";
import { choiceFromSpeech, cleanTranscript, firstSentence, spokenConfirm } from "@/lib/voice-text";
import { createVad, transcribe, voiceSupported, type VadHandle } from "@/lib/voice-vad";

// Conversa por voz (Rodada 14). Abre pelo microfone, Alt+V, "Dimeta" ou palmas.
// O detector de voz (VAD) percebe quando a pessoa começa e para de falar; o áudio vai para o
// Whisper (Groq) no servidor. Registra a frase completa e confirma falando em 1 frase; se faltar
// algo, pergunta. Depois de responder, continua ouvindo ~5 s ("e mais 20 de uber") e fecha no silêncio.

const FIRST_SILENCE_MS = 8000; // ao abrir
const NEXT_SILENCE_MS = 5000; // modo conversa, depois de cada resposta
const MAX_TURNS = 8;

type Phase = "loading" | "ready" | "listening" | "thinking" | "speaking" | "idle";
type Times = { gravar: number; transcrever: number; entender: number; salvar: number; falar: number; total: number };

function speak(text: string, onStart?: () => void): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!("speechSynthesis" in window)) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR";
      u.rate = 1.1;
      u.onstart = () => onStart?.();
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      setTimeout(resolve, 5000); // alguns navegadores não avisam o fim
    } catch {
      resolve();
    }
  });
}

const sec = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} s`;

export function VoiceChat({ name }: { name: string | null }) {
  const [open, setOpen] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<{ who: "eu" | "dimeta"; text: string }[]>([]);
  const [typed, setTyped] = useState("");
  const [times, setTimes] = useState<Times | null>(null);
  const vadRef = useRef<VadHandle | null>(null);
  const pendingRef = useRef(""); // frase que ainda espera um dado
  const lastRef = useRef<QuickState | null>(null);
  const turnsRef = useRef(0);
  const openRef = useRef(false);
  const silenceRef = useRef(0);
  const speechStartRef = useRef(0);
  const onAudioRef = useRef<(a: Float32Array) => void>(() => {});
  const listenRef = useRef<(waitMs: number) => void>(() => {});
  const params = useSearchParams();

  useEffect(() => {
    const id = requestAnimationFrame(() => setCanSpeak(voiceSupported()));
    return () => cancelAnimationFrame(id);
  }, []);

  const say = useCallback((who: "eu" | "dimeta", text: string) => setLines((l) => [...l.slice(-5), { who, text }]), []);

  const stopVad = useCallback(async () => {
    clearTimeout(silenceRef.current);
    const v = vadRef.current;
    vadRef.current = null;
    await v?.destroy().catch(() => {});
  }, []);

  const close = useCallback(() => {
    openRef.current = false;
    void stopVad().then(() => window.dispatchEvent(new Event("dimeta:voz-fim"))); // escuta volta só depois
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* nada */
    }
    setOpen(false);
    setPhase("idle");
    setLines([]);
    setTyped("");
    pendingRef.current = "";
    lastRef.current = null;
    turnsRef.current = 0;
  }, [stopVad]);

  // Manda a frase para o mesmo leitor do app (regras + IA) e reage à resposta.
  const send = useCallback(
    async (said: string, byVoice: boolean, t?: { gravar: number; transcrever: number; fim: number }) => {
      const text = said.trim();
      if (!text) return;
      say("eu", text);
      const last = lastRef.current;
      const fd = new FormData();
      const choice = last?.options?.length ? choiceFromSpeech(text) : null;
      if (choice && last?.text) {
        fd.set("text", last.text);
        fd.set("force", choice);
      } else {
        fd.set("text", pendingRef.current ? `${pendingRef.current} ${text}` : text);
      }
      fd.set("voice", "1");
      setPhase("thinking");
      const tq = performance.now();
      const r = await quickText({ status: "idle" }, fd);
      const quickMs = performance.now() - tq;
      if (!openRef.current) return;
      lastRef.current = r;
      turnsRef.current += 1;
      const shown = r.status === "saved" ? spokenConfirm(r.message ?? "Pronto.") : (r.message ?? "Não entendi.");
      const reply = firstSentence(shown);
      say("dimeta", shown);
      const isQuestion = r.status !== "saved" && (Boolean(r.ask) || /\?\s*$/.test(reply));
      pendingRef.current = r.status === "saved" ? "" : isQuestion && r.text ? r.text : "";

      setPhase("speaking");
      if (byVoice) {
        await speak(reply, () => {
          if (!t) return;
          const now = performance.now();
          const tm: Times = {
            gravar: t.gravar,
            transcrever: t.transcrever,
            entender: r.ms?.ai ?? 0,
            salvar: Math.max(0, quickMs - (r.ms?.ai ?? 0)),
            falar: Math.max(0, now - tq - quickMs),
            total: now - t.fim,
          };
          setTimes(tm);
          try {
            const k = "dimeta.voz.tempos";
            const old = JSON.parse(window.localStorage.getItem(k) ?? "[]") as Times[];
            window.localStorage.setItem(k, JSON.stringify([...old.slice(-19), tm]));
          } catch {
            /* sem armazenamento */
          }
          console.info("[Dimeta voz] tempos (ms)", tm);
        });
      } else await new Promise((res) => setTimeout(res, 900));
      if (!openRef.current) return;
      // Modo conversa: continua ouvindo um pouco para o próximo comando ou a resposta.
      if (byVoice && canSpeak && turnsRef.current < MAX_TURNS) listenRef.current(NEXT_SILENCE_MS);
      else if (r.status === "saved") close();
      else setPhase("idle");
    },
    [canSpeak, close, say],
  );

  // Fim da fala detectado pelo VAD: pausa o microfone, transcreve e manda.
  const onAudio = useCallback(
    async (audio: Float32Array) => {
      const fim = performance.now();
      clearTimeout(silenceRef.current);
      await vadRef.current?.pause();
      if (!openRef.current) return;
      setPhase("thinking");
      const gravar = speechStartRef.current ? fim - speechStartRef.current : (audio.length / 16000) * 1000;
      const tt = performance.now();
      const r = await transcribe(audio, "comando");
      const transcrever = performance.now() - tt;
      if (!openRef.current) return;
      const text = cleanTranscript(r.text);
      if (r.error === "ocupado") {
        say("dimeta", "A voz está ocupada agora. Escreva abaixo ou tente em instantes.");
        setPhase("idle");
        return;
      }
      if (!text) {
        // não deu para entender: escuta de novo
        listenRef.current(NEXT_SILENCE_MS);
        return;
      }
      await send(text, true, { gravar, transcrever, fim });
    },
    [say, send],
  );

  useEffect(() => {
    onAudioRef.current = (a) => void onAudio(a);
  }, [onAudio]);

  const listen = useCallback(
    async (waitMs: number) => {
      if (!openRef.current) return;
      clearTimeout(silenceRef.current);
      try {
        if (!vadRef.current) {
          setPhase("loading");
          vadRef.current = await createVad({
            onSpeechStart: () => {
              speechStartRef.current = performance.now();
              clearTimeout(silenceRef.current);
              setPhase("listening");
            },
            onMisfire: () => {
              // barulho curto: volta a esperar fala
              setPhase("ready");
              silenceRef.current = window.setTimeout(close, NEXT_SILENCE_MS);
            },
            onSpeechEnd: (a) => onAudioRef.current(a),
          });
          if (!openRef.current) return void stopVad();
        }
        speechStartRef.current = 0;
        await vadRef.current.start();
        setPhase("ready");
        silenceRef.current = window.setTimeout(close, waitMs); // silêncio: fecha sem registrar
      } catch (e) {
        const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
        say("dimeta", denied ? "Libere o microfone para o Dimeta nas configurações do navegador." : "Não consegui abrir o microfone. Escreva abaixo.");
        setPhase("idle");
      }
    },
    [close, say, stopVad],
  );

  useEffect(() => {
    listenRef.current = (ms) => void listen(ms);
  }, [listen]);

  const start = useCallback(
    async (opts: { greet?: boolean; text?: string } = {}) => {
      window.dispatchEvent(new Event("dimeta:voz-inicio")); // a escuta de "Dimeta"/palmas solta o microfone
      openRef.current = true;
      setOpen(true);
      setTimes(null);
      if (opts.text) {
        void send(opts.text, true);
        return;
      }
      if (opts.greet) {
        const hi = name ? `Oi, ${name}` : "Oi";
        say("dimeta", hi);
        setPhase("speaking");
        await speak(hi);
      }
      if (voiceSupported()) setTimeout(() => listenRef.current(FIRST_SILENCE_MS), opts.greet ? 0 : 250);
      else setPhase("idle");
    },
    [name, say, send],
  );

  // Alt+V, chamada pelo nome ou palmas (evento), e atalho do ícone do app (?voz=1).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        if (openRef.current) close();
        else void start();
      }
    };
    const onCall = (e: Event) => {
      const d = (e as CustomEvent<{ greet?: boolean; text?: string }>).detail ?? {};
      if (!openRef.current) void start(d);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("dimeta:falar", onCall);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("dimeta:falar", onCall);
    };
  }, [close, start]);
  useEffect(() => {
    if (params.get("voz") !== "1") return;
    const id = requestAnimationFrame(() => void start());
    return () => cancelAnimationFrame(id);
    // abre uma vez ao chegar pelo atalho
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  useEffect(() => () => void stopVad(), [stopVad]);

  const status =
    phase === "loading"
      ? "Ligando o microfone…"
      : phase === "ready"
        ? "Pode falar"
        : phase === "listening"
          ? "Ouvindo…"
          : phase === "thinking"
            ? "Entendendo…"
            : phase === "speaking"
              ? "Respondendo…"
              : canSpeak
                ? "Toque no microfone para falar"
                : "Este navegador não grava voz. Escreva abaixo.";

  const trigger = (
    <button
      type="button"
      onClick={() => void start()}
      aria-label="Falar com o Dimeta (Alt+V)"
      title="Falar (Alt+V)"
      className="mic-btn grid h-11 w-11 place-items-center rounded-full text-white shadow-lg shadow-black/30 hover:brightness-110"
    >
      <Mic size={20} strokeWidth={2.2} aria-hidden />
    </button>
  );

  const hot = phase === "listening" || phase === "ready";

  return (
    <>
      {/* Computador: canto superior direito. Celular: botão flutuante pequeno acima do "+". */}
      <div className="fixed top-4 right-5 z-30 hidden lg:block">{trigger}</div>
      <div className="fixed right-5 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-30 lg:hidden">{trigger}</div>

      {open ? (
        <Modal label="Falar com o Dimeta" onClose={close}>
          <ModalHeader title="Falar com o Dimeta" onClose={close} />
          <div className="mt-4 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => (hot ? close() : listenRef.current(FIRST_SILENCE_MS))}
              disabled={!canSpeak || phase === "thinking" || phase === "speaking" || phase === "loading"}
              aria-label={hot ? "Parar" : "Falar"}
              className={`grid h-16 w-16 place-items-center rounded-full text-white transition-colors disabled:opacity-50 ${
                phase === "listening" ? "animate-pulse bg-[#ff7a93]" : "mic-btn"
              }`}
            >
              <Mic size={28} aria-hidden />
            </button>
            <p role="status" className="text-sm font-semibold text-ink-soft">
              {status}
            </p>
          </div>
          {lines.length ? (
            <ul className="mt-2 space-y-1.5" aria-live="polite">
              {lines.map((l, i) => (
                <li
                  key={i}
                  className={`rounded-2xl px-3.5 py-2 text-[15px] ${
                    l.who === "eu" ? "ml-8 bg-[#1b2a8a] text-right" : "mr-8 bg-white/[0.06]"
                  }`}
                >
                  {l.text}
                </li>
              ))}
            </ul>
          ) : null}
          {times ? (
            <p className="mt-2 text-center text-[11px] text-ink-soft">
              Da sua fala até a resposta: {sec(times.total)} (transcrever {sec(times.transcrever)} · entender{" "}
              {sec(times.entender)} · salvar {sec(times.salvar)})
            </p>
          ) : null}
          <form
            className="mt-4 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              clearTimeout(silenceRef.current);
              void vadRef.current?.pause();
              const t = typed;
              setTyped("");
              void send(t, false);
            }}
          >
            <input
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                clearTimeout(silenceRef.current); // digitando: não fecha sozinho
              }}
              maxLength={160}
              aria-label="Escrever"
              placeholder="Ou escreva: mercado 45 pix"
              className="h-11 min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-[#0f1634] px-3.5 text-[15px] outline-none placeholder:text-white/35 focus:border-[#a78bfa]"
            />
            <button
              type="submit"
              aria-label="Enviar"
              disabled={!typed.trim() || phase === "thinking"}
              className="grad-primary grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white disabled:opacity-50"
            >
              <Send size={18} aria-hidden />
            </button>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
