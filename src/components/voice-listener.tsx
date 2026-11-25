"use client";

import { useEffect } from "react";
import { afterWakeWord, hasWakeWord, isDoubleClap } from "@/lib/voice-text";

// EXPERIMENTAL: dizer "Dimeta" (computador e celular, só com o app aberto e a tela ligada)
// ou bater duas palmas (só computador) abre a conversa por voz. Liga no Perfil, com aviso.
//
// Correção da Rodada 13: a escuta solta o microfone (para o reconhecimento e fecha o
// fluxo de áudio das palmas) ANTES de abrir a conversa, e só volta quando ela termina.
// Antes, a escuta continuava presa ao microfone e a conversa não recebia a fala.
export const WAKE_KEY = "dimeta.voz.escuta";

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
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
    if (!on) return;
    const desktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;

    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    let stopped = false;
    let busy = false; // a conversa está aberta: a escuta fica desligada
    let rec: Rec | null = null;
    let restartTimer = 0;

    // Palmas (só computador): picos de volume no microfone.
    let audio: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let raf = 0;
    const peaks: number[] = [];

    const stopClaps = () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      void audio?.close().catch(() => {});
      audio = null;
    };

    const stopWake = () => {
      const r = rec;
      rec = null;
      if (r) {
        r.onend = null;
        r.onresult = null;
        try {
          r.abort();
        } catch {
          /* já parado */
        }
      }
    };

    // Solta o microfone e só então abre a conversa (o navegador precisa de um instante).
    const call = (text = "") => {
      if (busy) return;
      busy = true;
      clearTimeout(restartTimer);
      stopWake();
      stopClaps();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("dimeta:falar", { detail: text ? { text } : { greet: true } }));
      }, 350);
    };

    const startWake = () => {
      if (!Ctor || stopped || busy || document.hidden || rec) return;
      const r = new Ctor();
      r.lang = "pt-BR";
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const said = e.results[i][0]?.transcript ?? "";
          if (hasWakeWord(said)) {
            // "Dimeta, mercado 45 pix" na mesma fala: espera o fim da frase e já manda o comando.
            const rest = afterWakeWord(said);
            if (rest && !e.results[i].isFinal) return;
            return call(rest.length > 3 ? rest : "");
          }
        }
      };
      r.onend = () => {
        if (rec === r) rec = null;
        if (!stopped && !busy) restartTimer = window.setTimeout(startWake, 400);
      };
      r.onerror = () => {};
      rec = r;
      try {
        r.start();
      } catch {
        rec = null;
      }
    };

    const startClaps = async () => {
      if (!desktop || stopped || busy || stream) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (busy || stopped) return stopClaps();
        audio = new AudioContext();
        const an = audio.createAnalyser();
        an.fftSize = 512;
        audio.createMediaStreamSource(stream).connect(an);
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
              return;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        stopClaps(); // sem microfone: fica só a palavra
      }
    };

    const resume = () => {
      if (stopped || busy || document.hidden) return;
      startWake();
      void startClaps();
    };
    // A conversa abriu por outro caminho (botão ou Alt+V): solta o microfone também.
    const onStart = () => {
      busy = true;
      clearTimeout(restartTimer);
      stopWake();
      stopClaps();
    };
    // A conversa terminou: volta a escutar.
    const onEnd = () => {
      busy = false;
      restartTimer = window.setTimeout(resume, 800);
    };
    // Tela desligada ou app em segundo plano: solta o microfone.
    const onVisible = () => {
      if (document.hidden) {
        stopWake();
        stopClaps();
      } else resume();
    };
    window.addEventListener("dimeta:voz-fim", onEnd);
    window.addEventListener("dimeta:voz-inicio", onStart);
    document.addEventListener("visibilitychange", onVisible);
    resume();

    return () => {
      stopped = true;
      clearTimeout(restartTimer);
      stopWake();
      stopClaps();
      window.removeEventListener("dimeta:voz-fim", onEnd);
      window.removeEventListener("dimeta:voz-inicio", onStart);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
