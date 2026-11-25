"use client";

import { useState } from "react";
import { benchIntent, quickText, voiceContext } from "@/app/app/actions";
import { cleanTranscript, hasWakeWord } from "@/lib/voice-text";
import { createVad, transcribe } from "@/lib/voice-vad";

const AUDIOS = ["mercado_45_no_pix", "uber", "dimeta", "tosse"];
const FRASES = [
  "mercado 45 no pix",
  "uber 18 no débito",
  "ifood 32 no crédito",
  "gasolina 120 no inter",
  "salário 2900",
  "farmácia 37,90 pix",
  "prova de estatística sexta 19h",
  "dentista amanhã 14h30",
  "gastei 30",
  "e mais 20 de uber",
];
const MODELS = ["openai/gpt-oss-120b"];

// WAV 16 bits mono → Float32 (os arquivos de teste já estão em 16 kHz).
function wavToFloat(buf: ArrayBuffer): Float32Array {
  const v = new DataView(buf);
  let off = 12;
  while (off < v.byteLength - 8) {
    const id = String.fromCharCode(v.getUint8(off), v.getUint8(off + 1), v.getUint8(off + 2), v.getUint8(off + 3));
    const size = v.getUint32(off + 4, true);
    if (id === "data") {
      const n = size / 2;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = v.getInt16(off + 8 + i * 2, true) / 32768;
      return out;
    }
    off += 8 + size;
  }
  return new Float32Array();
}

type Row = Record<string, string | number>;

export function VoiceBench() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState("");
  const add = (r: Row) => setRows((x) => [...x, r]);

  async function runAudio() {
    setBusy("audio");
    void fetch("/api/voz"); // como o pop-up: acorda o servidor ao abrir
    const ctx = await voiceContext();
    for (let rep = 0; rep < 2; rep++) {
      for (const a of AUDIOS) {
        const buf = await (await fetch(`/voz-teste/${a}.wav`)).arrayBuffer();
        const samples = wavToFloat(buf);
        const modo = a === "dimeta" || a === "tosse" ? "chamada" : "comando";
        const t = performance.now();
        const r = await transcribe(samples, modo, modo === "comando" ? ctx.words : []);
        const text = cleanTranscript(r.text);
        add({
          etapa: `transcrever (${modo})`,
          audio: a,
          texto: text || "(vazio)",
          abre: modo === "chamada" ? (hasWakeWord(text) ? "sim" : "não") : "",
          ida_e_volta_ms: Math.round(performance.now() - t),
          whisper_ms: r.ms?.whisper ?? "",
          palavras_ms: r.ms?.palavras ?? "",
          erro: r.error ?? "",
        });
      }
    }
    setBusy("");
  }

  async function runModels() {
    setBusy("modelos");
    for (const m of MODELS) {
      await new Promise((r) => setTimeout(r, 8000)); // pausa: evita o limite da Groq
      const out = await benchIntent(FRASES, m);
      for (const o of out) add({ etapa: "entender", modelo: m, frase: o.phrase, ms: o.ms, resultado: JSON.stringify(o.result) });
    }
    setBusy("");
  }

  async function runSave() {
    setBusy("salvar");
    for (const f of ["mercado 45 no pix", "uber 18 no débito", "ifood 32 no pix"]) {
      const fd = new FormData();
      fd.set("text", f);
      fd.set("voice", "1");
      const t = performance.now();
      const r = await quickText({ status: "idle" }, fd);
      add({ etapa: "registrar (texto → salvo)", frase: f, ida_e_volta_ms: Math.round(performance.now() - t), ia_ms: r.ms?.ai ?? "", servidor_ms: r.ms?.total ?? "", resposta: r.message ?? "" });
    }
    setBusy("");
  }

  async function runVad() {
    setBusy("vad");
    const t = performance.now();
    try {
      const v = await createVad({ onSpeechEnd: () => {} });
      const load = performance.now() - t;
      await v.start();
      add({ etapa: "abrir detector de voz", ms: Math.round(load), ok: "sim" });
      await v.destroy();
    } catch (e) {
      add({ etapa: "abrir detector de voz", ms: Math.round(performance.now() - t), ok: "não", erro: String(e) });
    }
    setBusy("");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Teste de voz</h1>
      <div className="flex flex-wrap gap-2">
        {[
          ["Transcrição", runAudio],
          ["Modelos da IA", runModels],
          ["Registrar", runSave],
          ["Detector de voz", runVad],
        ].map(([label, fn]) => (
          <button
            key={label as string}
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void (fn as () => Promise<void>)()}
            className="grad-primary rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {label as string}
          </button>
        ))}
      </div>
      <p role="status" className="text-sm text-ink-soft">
        {busy ? `Medindo: ${busy}…` : `${rows.length} medições`}
      </p>
      <pre id="resultado" className="glass max-h-[70vh] overflow-auto rounded-2xl p-3 text-[11px] whitespace-pre-wrap">
        {rows.map((r) => JSON.stringify(r)).join("\n")}
      </pre>
    </div>
  );
}
