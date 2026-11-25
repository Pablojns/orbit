"use client";

// Detector de voz (VAD, modelo Silero rodando no navegador). Os arquivos ficam em /vad
// (copiados do pacote no build). Cada instância abre o próprio microfone e o solta no destroy().
import type { MicVAD } from "@ricky0123/vad-web";

export type VadHandle = {
  start: () => Promise<void>;
  pause: () => Promise<void>;
  destroy: () => Promise<void>;
};

export type VadOptions = {
  onSpeechStart?: () => void;
  onSpeechEnd: (audio: Float32Array) => void;
  onMisfire?: () => void;
  redemptionMs?: number; // silêncio que encerra a fala
  minSpeechMs?: number;
  positiveSpeechThreshold?: number;
};

export function voiceSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof AudioContext !== "undefined" &&
    typeof WebAssembly !== "undefined"
  );
}

export async function createVad(o: VadOptions): Promise<VadHandle> {
  const { MicVAD: Vad } = await import("@ricky0123/vad-web");
  let stream: MediaStream | null = null;
  const vad: MicVAD = await Vad.new({
    model: "v5",
    baseAssetPath: "/vad/",
    onnxWASMBasePath: "/vad/",
    startOnLoad: false,
    positiveSpeechThreshold: o.positiveSpeechThreshold ?? 0.5,
    negativeSpeechThreshold: (o.positiveSpeechThreshold ?? 0.5) - 0.15,
    redemptionMs: o.redemptionMs ?? 600,
    minSpeechMs: o.minSpeechMs ?? 250,
    preSpeechPadMs: 300,
    submitUserSpeechOnPause: false,
    getStream: async () => {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      return stream;
    },
    pauseStream: async () => {},
    resumeStream: async (s) => s,
    onSpeechStart: () => o.onSpeechStart?.(),
    onSpeechRealStart: () => {},
    onVADMisfire: () => o.onMisfire?.(),
    onFrameProcessed: () => {},
    onSpeechEnd: (audio) => o.onSpeechEnd(audio),
  });
  return {
    start: () => vad.start(),
    pause: () => vad.pause(),
    destroy: async () => {
      try {
        await vad.destroy();
      } finally {
        (stream as MediaStream | null)?.getTracks().forEach((t) => t.stop()); // solta o microfone de verdade
        stream = null;
      }
    },
  };
}

// Manda o áudio para o servidor transcrever (Groq Whisper).
export async function transcribe(
  audio: Float32Array,
  modo: "comando" | "chamada",
): Promise<{ text: string; ms?: { palavras: number; whisper: number; total: number }; error?: string }> {
  const { encodeWav } = await import("@/lib/wav");
  const fd = new FormData();
  fd.set("audio", new Blob([encodeWav(audio)], { type: "audio/wav" }), "fala.wav");
  fd.set("modo", modo);
  try {
    const res = await fetch("/api/voz", { method: "POST", body: fd });
    const data = (await res.json()) as { text?: string; ms?: { palavras: number; whisper: number; total: number }; error?: string };
    return { text: data.text ?? "", ms: data.ms, error: res.ok ? undefined : (data.error ?? "falhou") };
  } catch {
    return { text: "", error: "rede" };
  }
}
