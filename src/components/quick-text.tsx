"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { type QuickState, quickText } from "@/app/app/actions";
import { useAutoOpen } from "./use-auto-open";

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Lança escrevendo ou falando uma frase:
// dinheiro ("mercado 45 pix", "uber 18 nubank") ou agenda ("prova sexta 19h algoritmo").
export function QuickText({ floating = false }: { floating?: boolean }) {
  const [state, action, pending] = useActionState<QuickState, FormData>(quickText, { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<Recognition | null>(null);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  useEffect(() => {
    if (state.status === "saved") formRef.current?.reset();
  }, [state]);
  useEffect(() => {
    const id = requestAnimationFrame(() => setCanSpeak(getRecognition() !== null));
    return () => cancelAnimationFrame(id);
  }, []);
  useAutoOpen("frase", () => inputRef.current?.focus());

  function toggleVoice() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Rec = getRecognition();
    if (!Rec) return;
    const rec = new Rec();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript?.trim();
      if (said && inputRef.current) {
        inputRef.current.value = said;
        formRef.current?.requestSubmit();
      }
    };
    rec.onerror = (e) => {
      setVoiceError(
        e.error === "not-allowed" ? "Libere o microfone para o Dimeta nas configurações do navegador." : "Não entendi. Tente de novo.",
      );
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setVoiceError("");
    setListening(true);
    rec.start();
  }

  const message = voiceError || state.message;
  // Resposta a um botão da dúvida: reenvia a mesma frase dizendo o que ela é.
  function answer(force: string) {
    const fd = new FormData();
    fd.set("text", state.text ?? inputRef.current?.value ?? "");
    fd.set("force", force);
    startTransition(() => action(fd));
  }
  const tone = voiceError || (state.status === "error" && state.tone !== "info") ? "text-loss" : state.tone === "info" ? "text-ink" : "text-gain";
  return (
    <form
      ref={formRef}
      action={action}
      className={`glass rounded-[18px] p-2 ${floating ? "shadow-lg shadow-black/30" : ""}`}
    >
      <div className="flex items-center gap-2">
        {canSpeak ? (
          <button
            type="button"
            onClick={toggleVoice}
            aria-label={listening ? "Parar de ouvir" : "Falar em vez de escrever"}
            title={listening ? "Parar de ouvir" : "Falar"}
            aria-pressed={listening}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-colors ${
              listening ? "bg-loss text-white" : "mic-btn text-white hover:brightness-110"
            }`}
          >
            <Mic size={20} strokeWidth={2.2} className={listening ? "animate-pulse" : ""} aria-hidden />
          </button>
        ) : (
          <Sparkles size={18} className="ml-1 shrink-0 text-cobalt" aria-hidden />
        )}
        <input
          ref={inputRef}
          name="text"
          required
          maxLength={160}
          autoComplete="off"
          enterKeyHint="send"
          aria-label="Lançar escrevendo"
          placeholder={listening ? "Pode falar…" : "Escreva ou fale: mercado 45 pix · prova sexta 19h"}
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-white/35"
        />
        <button
          type="submit"
          disabled={pending}
          className="grad-primary h-11 shrink-0 rounded-2xl px-5 text-[15px] font-bold text-white hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "…" : "Lançar"}
        </button>
      </div>
      {message ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
          <p role="status" className={`text-[13px] ${tone}`}>
            {message}
          </p>
          {!voiceError && state.options?.length
            ? state.options.map((o) => (
                <button
                  key={o.force}
                  type="button"
                  disabled={pending}
                  onClick={() => answer(o.force)}
                  className="rounded-full bg-white/[0.08] px-3 py-1 text-[13px] font-semibold hover:bg-white/[0.14] disabled:opacity-50"
                >
                  {o.label}
                </button>
              ))
            : null}
        </div>
      ) : null}
    </form>
  );
}

// Barra fixa no topo das telas do app. No Início ela fica logo abaixo do Saldo (Rodada 3).
export function QuickTextBar() {
  const pathname = usePathname();
  if (pathname === "/app") return null;
  return (
    <div className="sticky top-0 z-30 pt-3 pb-2 lg:pt-5">
      <QuickText floating />
    </div>
  );
}
