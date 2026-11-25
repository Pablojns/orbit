"use client";

import { useEffect } from "react";
import { ClapDetector, cleanTranscript, hasWakeWord } from "@/lib/voice-text";
import { createVad, transcribe, voiceSupported, type VadHandle } from "@/lib/voice-vad";

// EXPERIMENTAL: dizer "Dimeta" (computador e celular, só com o app aberto e a tela ligada)
// ou bater duas palmas (só computador) abre a conversa por voz. Liga no Perfil, com aviso.
//
// Rodada 14: antes qualquer som abria. Agora:
// - "Dimeta": o detector de voz (VAD) só reage a FALA humana. Cada fala curta (até 2 s) vai para
//   o Whisper e a conversa só abre se o texto tiver "dimeta". Tosse e barulho não viram fala.
// - Palmas: só duas batidas secas com 150–600 ms entre elas e silêncio antes, entre e depois.
// - A escuta solta o microfone ANTES de abrir a conversa e só volta quando ela termina.
export const WAKE_KEY = "dimeta.voz.escuta";

const WAKE_MAX_MS = 2000; // só os 2 primeiros segundos de cada fala
const WAKE_SKIP_LONG_MS = 6000; // falas longas (conversa, TV) nem são enviadas
const WAKE_MAX_PER_HOUR = 90; // limite de envios para não gastar a cota da Groq com barulho

export function VoiceListener() {
  useEffect(() => {
    let on = false;
    try {
      on = window.localStorage.getItem(WAKE_KEY) === "on";
    } catch {
      on = false;
    }
    if (!on || !voiceSupported()) return;
    const desktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;

    let stopped = false;
    let busy = false; // a conversa está aberta: a escuta fica desligada
    let vad: VadHandle | null = null;
    let starting = false;
    let checking = false;
    let restartTimer = 0;
    const sent: number[] = [];

    // Palmas (só computador): análise do volume no microfone.
    let audio: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let raf = 0;

    const stopClaps = () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      void audio?.close().catch(() => {});
      audio = null;
    };
    const stopWake = async () => {
      const v = vad;
      vad = null;
      await v?.destroy().catch(() => {});
    };

    // Solta o microfone e só então abre a conversa.
    const call = async () => {
      if (busy) return;
      busy = true;
      clearTimeout(restartTimer);
      stopClaps();
      await stopWake();
      setTimeout(() => window.dispatchEvent(new CustomEvent("dimeta:falar", { detail: { greet: true } })), 150);
    };

    const onSpeech = async (a: Float32Array) => {
      const ms = (a.length / 16000) * 1000;
      if (busy || checking || ms > WAKE_SKIP_LONG_MS) return;
      const now = Date.now();
      while (sent.length && now - sent[0] > 3_600_000) sent.shift();
      if (sent.length >= WAKE_MAX_PER_HOUR) return;
      sent.push(now);
      checking = true;
      try {
        const r = await transcribe(a.slice(0, (WAKE_MAX_MS / 1000) * 16000), "chamada");
        if (!busy && hasWakeWord(cleanTranscript(r.text))) await call();
      } finally {
        checking = false;
      }
    };

    const startWake = async () => {
      if (stopped || busy || document.hidden || vad || starting) return;
      starting = true;
      try {
        const v = await createVad({
          onSpeechEnd: (a) => void onSpeech(a),
          minSpeechMs: 300,
          redemptionMs: 400,
          positiveSpeechThreshold: 0.6, // mais exigente: só fala clara
        });
        if (stopped || busy || document.hidden) await v.destroy();
        else {
          vad = v;
          await v.start();
        }
      } catch {
        /* sem microfone ou sem permissão: fica sem a palavra */
      } finally {
        starting = false;
      }
    };

    const startClaps = async () => {
      if (!desktop || stopped || busy || stream) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        if (busy || stopped) return stopClaps();
        audio = new AudioContext();
        const an = audio.createAnalyser();
        an.fftSize = 1024; // ~20 ms por leitura
        audio.createMediaStreamSource(stream).connect(an);
        const buf = new Float32Array(an.fftSize);
        const det = new ClapDetector();
        const tick = () => {
          an.getFloatTimeDomainData(buf);
          let peak = 0;
          for (const v of buf) peak = Math.max(peak, Math.abs(v));
          if (det.push(performance.now(), peak)) return void call();
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        stopClaps(); // sem microfone: fica só a palavra
      }
    };

    const resume = () => {
      if (stopped || busy || document.hidden) return;
      void startWake();
      void startClaps();
    };
    // A conversa abriu por outro caminho (botão ou Alt+V): solta o microfone também.
    const onStart = () => {
      busy = true;
      clearTimeout(restartTimer);
      stopClaps();
      void stopWake();
    };
    // A conversa terminou (e já soltou o microfone): volta a escutar.
    const onEnd = () => {
      busy = false;
      restartTimer = window.setTimeout(resume, 600);
    };
    // Tela desligada ou app em segundo plano: solta o microfone.
    const onVisible = () => {
      if (document.hidden) {
        stopClaps();
        void stopWake();
      } else resume();
    };
    window.addEventListener("dimeta:voz-fim", onEnd);
    window.addEventListener("dimeta:voz-inicio", onStart);
    document.addEventListener("visibilitychange", onVisible);
    resume();

    return () => {
      stopped = true;
      clearTimeout(restartTimer);
      stopClaps();
      void stopWake();
      window.removeEventListener("dimeta:voz-fim", onEnd);
      window.removeEventListener("dimeta:voz-inicio", onStart);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
