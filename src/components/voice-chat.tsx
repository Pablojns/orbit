"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type QuickState, quickText } from "@/app/app/actions";
import { Modal, ModalHeader } from "./modal";
import { choiceFromSpeech, mergeVoice, spokenConfirm } from "@/lib/voice-text";

// Conversa por voz (Rodada 13). Abre pelo microfone, Alt+V, "Dimeta" ou palmas.
// Mostra o texto ao vivo, registra a frase completa e confirma falando; se faltar algo,
// pergunta falando um dado por vez e abre o microfone sozinha. Sem fala em ~8 s, fecha.

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SILENCE_MS = 8000;
const MAX_TURNS = 5;

type Phase = "listening" | "thinking" | "speaking" | "idle";

function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!("speechSynthesis" in window)) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR";
      u.rate = 1.05;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      setTimeout(resolve, 6000); // alguns navegadores não avisam o fim
    } catch {
      resolve();
    }
  });
}

export function VoiceChat({ name }: { name: string | null }) {
  const [open, setOpen] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [live, setLive] = useState("");
  const [lines, setLines] = useState<{ who: "eu" | "dimeta"; text: string }[]>([]);
  const [typed, setTyped] = useState("");
  const recRef = useRef<Recognition | null>(null);
  const pendingRef = useRef(""); // frase que ainda espera um dado
  const lastRef = useRef<QuickState | null>(null);
  const turnsRef = useRef(0);
  const openRef = useRef(false);
  const listenRef = useRef<() => void>(() => {});
  const params = useSearchParams();

  useEffect(() => {
    const id = requestAnimationFrame(() => setCanSpeak(getRecognition() !== null));
    return () => cancelAnimationFrame(id);
  }, []);

  const say = useCallback((who: "eu" | "dimeta", text: string) => setLines((l) => [...l.slice(-5), { who, text }]), []);

  const close = useCallback(() => {
    openRef.current = false;
    recRef.current?.abort();
    recRef.current = null;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* nada */
    }
    setOpen(false);
    setPhase("idle");
    setLive("");
    setLines([]);
    setTyped("");
    pendingRef.current = "";
    lastRef.current = null;
    turnsRef.current = 0;
    window.dispatchEvent(new Event("dimeta:voz-fim"));
  }, []);

  // Manda a frase para o mesmo leitor da barra antiga (regras + IA) e reage à resposta.
  const send = useCallback(
    async (said: string, byVoice: boolean) => {
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
      const r = await quickText({ status: "idle" }, fd);
      if (!openRef.current) return;
      lastRef.current = r;
      turnsRef.current += 1;
      const reply = r.status === "saved" ? spokenConfirm(r.message ?? "Pronto.") : (r.message ?? "Não entendi.");
      say("dimeta", reply);
      if (r.status === "saved") {
        pendingRef.current = "";
        setPhase("speaking");
        if (byVoice) await speak(reply);
        else await new Promise((res) => setTimeout(res, 1200));
        if (openRef.current) close();
        return;
      }
      const isQuestion = Boolean(r.ask) || /\?\s*$/.test(reply);
      pendingRef.current = isQuestion && r.text ? r.text : "";
      if (byVoice) {
        setPhase("speaking");
        await speak(reply);
      }
      if (!openRef.current) return;
      if (isQuestion && byVoice && turnsRef.current < MAX_TURNS) listenRef.current();
      else setPhase("idle");
    },
    [close, say],
  );

  const listen = useCallback(() => {
    const Rec = getRecognition();
    if (!Rec || !openRef.current) return;
    recRef.current?.abort();
    const rec = new Rec();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let heard = "";
    let failed = false;
    let silence = setTimeout(() => rec.abort(), SILENCE_MS);
    rec.onresult = (e) => {
      clearTimeout(silence);
      silence = setTimeout(() => rec.stop(), SILENCE_MS);
      heard = mergeVoice(Array.from(e.results, (r) => ({ transcript: r[0]?.transcript ?? "", isFinal: r.isFinal }))).text;
      setLive(heard);
    };
    rec.onerror = (e) => {
      failed = e.error !== "no-speech" && e.error !== "aborted";
      if (e.error === "not-allowed") say("dimeta", "Libere o microfone para o Dimeta nas configurações do navegador.");
    };
    rec.onend = () => {
      clearTimeout(silence);
      if (recRef.current === rec) recRef.current = null;
      setLive("");
      if (!openRef.current) return;
      if (heard.trim()) void send(heard, true);
      else if (failed) setPhase("idle");
      else close(); // ~8 s sem fala: fecha sem registrar
    };
    recRef.current = rec;
    setPhase("listening");
    try {
      rec.start();
    } catch {
      setPhase("idle");
    }
  }, [close, say, send]);

  useEffect(() => {
    listenRef.current = listen;
  }, [listen]);

  const start = useCallback(
    async (opts: { greet?: boolean; text?: string } = {}) => {
      window.dispatchEvent(new Event("dimeta:voz-inicio")); // a escuta de "Dimeta"/palmas solta o microfone
      openRef.current = true;
      setOpen(true);
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
      // dá tempo de a escuta soltar o microfone antes de abrir o reconhecimento
      if (getRecognition()) setTimeout(listen, opts.greet ? 0 : 300);
      else setPhase("idle");
    },
    [listen, name, say, send],
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

  const status =
    phase === "listening"
      ? "Ouvindo…"
      : phase === "thinking"
        ? "Entendendo…"
        : phase === "speaking"
          ? "Respondendo…"
          : canSpeak
            ? "Toque no microfone para falar"
            : "Este navegador não reconhece voz. Escreva abaixo.";

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
              onClick={() => (phase === "listening" ? recRef.current?.stop() : listen())}
              disabled={!canSpeak || phase === "thinking" || phase === "speaking"}
              aria-label={phase === "listening" ? "Parar de ouvir" : "Falar"}
              className={`grid h-16 w-16 place-items-center rounded-full text-white transition-colors disabled:opacity-50 ${
                phase === "listening" ? "animate-pulse bg-[#ff7a93]" : "mic-btn"
              }`}
            >
              <Mic size={28} aria-hidden />
            </button>
            <p role="status" className="text-sm font-semibold text-ink-soft">
              {status}
            </p>
            <p className="min-h-7 text-center text-lg font-bold" aria-live="polite">
              {live}
            </p>
          </div>
          {lines.length ? (
            <ul className="mt-2 space-y-1.5">
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
          <form
            className="mt-4 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              recRef.current?.abort();
              const t = typed;
              setTyped("");
              void send(t, false);
            }}
          >
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
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
