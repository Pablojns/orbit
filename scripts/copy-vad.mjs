// Copia os arquivos do detector de voz (VAD) para public/vad, servidos pelo próprio app.
// Roda sozinho depois do npm install (postinstall), inclusive na Vercel.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const out = join(process.cwd(), "public", "vad");
mkdirSync(out, { recursive: true });
const files = [
  ["node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js", "vad.worklet.bundle.min.js"],
  ["node_modules/@ricky0123/vad-web/dist/silero_vad_v5.onnx", "silero_vad_v5.onnx"],
  ["node_modules/@ricky0123/vad-web/dist/silero_vad_legacy.onnx", "silero_vad_legacy.onnx"],
  ["node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.mjs"],
  ["node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.wasm"],
];
for (const [from, name] of files) {
  if (existsSync(from)) copyFileSync(from, join(out, name));
  else console.warn(`copy-vad: não achei ${from}`);
}
console.log("copy-vad: ok");
