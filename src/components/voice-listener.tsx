"use client";

import { useEffect } from "react";
import { hasWakeWord, isDoubleClap } from "@/lib/voice-text";

// EXPERIMENTAL (Rodada 7): no computador, com a aba aberta, dizer "Dimeta" ou bater duas
// palmas abre o microfone da barra. Só liga depois do consentimento no Perfil e pode ser
// desligado a qualquer momento. Não funciona em segundo plano.
export const WAKE_KEY = "dimeta.voz.escuta";

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

export function VoiceListener() {
  useEffect(() => {
    let on = false;
    try {
      on = window.localStorage.getItem(WAKE_KEY) === "on";
    } catch {
      on = false;
    }
    const desktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
    if (!on || !desktop) return;

    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    let stopped = false;
    let busy = false; // a barra está ouvindo um comando
    let rec: Rec | null = null;

    const call = () => {
      if (busy) return;
      busy = true;
      rec?.abort();
      window.dispatchEvent(new Event("dimeta:falar"));
    };

    const startWake = () => {
      if (!Ctor || stopped || busy || document.hidden) return;
      rec = new Ctor();
      rec.lang = "pt-BR";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (hasWakeWord(e.results[i][0]?.transcript ?? "")) return call();
        }
      };
      rec.onend = () => {
        if (!stopped && !busy) setTimeout(startWake, 400);
      };
      rec.onerror = () => {};
      try {
        rec.start();
      } catch {
        /* já estava ouvindo */
      }
    };

    // Palmas: picos de volume no microfone.
    let audio: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let raf = 0;
    const peaks: number[] = [];
    const startClaps = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audio = new AudioContext();
        const src = audio.createMediaStreamSource(stream);
        const an = audio.createAnalyser();
        an.fftSize = 512;
        src.connect(an);
        const buf = new Uint8Array(an.fftSize);
        let last = 0;
        const tick = () => {
          an.getByteTimeDomainData(buf);
          let peak = 0;
          for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
          const now = performance.now();
          if (peak > 100 && now - last > 100) {
            last = now;
            peaks.push(now);
            while (peaks.length > 6) peaks.shift();
            if (isDoubleClap(peaks, now)) {
              peaks.length = 0;
              call();
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        /* sem microfone: fica só a palavra */
      }
    };

    const onEnd = () => {
      busy = false;
      setTimeout(startWake, 600);
    };
    const onVisible = () => {
      if (!document.hidden) startWake();
    };
    window.addEventListener("dimeta:voz-fim", onEnd);
    document.addEventListener("visibilitychange", onVisible);
    startWake();
    void startClaps();

    return () => {
      stopped = true;
      rec?.abort();
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void audio?.close();
      window.removeEventListener("dimeta:voz-fim", onEnd);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
