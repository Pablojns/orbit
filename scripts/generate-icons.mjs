// Gera os ícones PNG do app a partir de scripts/icon.svg.
// Uso: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile(new URL("./icon.svg", import.meta.url));
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname;

for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(out(name));
}
await sharp(svg, { density: 300 }).resize(48, 48).png().toFile(out("favicon-48.png"));
console.log("ícones gerados em public/icons/");
