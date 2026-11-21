"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import { type FormState, quickText } from "@/app/app/actions";
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
export function QuickText() {
  const [state, action, pending] = useActionState<FormState, FormData>(quickText, { status: "idle" });
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
  return (
    <form ref={formRef} action={action} className="glass rounded-[1.5rem] p-2.5">
      <div className="flex items-center gap-2">
        {canSpeak ? (
          <button
            type="button"
            onClick={toggleVoice}
            aria-label={listening ? "Parar de ouvir" : "Falar em vez de escrever"}
            title={listening ? "Parar de ouvir" : "Falar"}
            aria-pressed={listening}
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-full transition-colors ${
              listening ? "bg-loss text-white" : "grad-primary text-white hover:brightness-110"
            }`}
          >
            <Mic size={24} strokeWidth={2.2} className={listening ? "animate-pulse" : ""} aria-hidden />
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
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-white/30"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-xl bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-ink hover:bg-white/[0.12] disabled:opacity-60"
        >
          {pending ? "…" : "Lançar"}
        </button>
      </div>
      {message ? (
        <p
          role="status"
          className={`mt-2 px-1 text-[13px] ${voiceError || state.status === "error" ? "text-loss" : "text-gain"}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

// Barra fixa no topo de todas as telas do app (decisão 1, 21/11).
export function QuickTextBar() {
  return (
    <div className="sticky top-0 z-30 -mx-5 bg-[#070a1a]/80 px-5 pt-3 pb-2 backdrop-blur-md lg:-mx-10 lg:px-10 lg:pt-5">
      <QuickText />
    </div>
  );
}
