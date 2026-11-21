// Dinheiro sempre em centavos (inteiro). Nunca use float para somar valores.
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Negativo escrito de um jeito só no app inteiro: "− R$ 688,70".
export function formatCents(cents: number) {
  const text = brl.format(Math.abs(cents) / 100).replace(/\u00a0/g, " ");
  return cents < 0 ? `− ${text}` : text;
}

// Do jeito que o brasileiro escreve -> centavos. Retorna null se inválido.
// "1.234,56" | "1234,56" | "6.000" | "6.000,00" | "1.50" | "1234.56" | "12"
export function parseToCents(input: string): number | null {
  const clean = input.replace(/[R$\s]/g, "");
  if (!clean) return null;
  let normalized: string;
  if (clean.includes(",")) normalized = clean.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) normalized = clean.replace(/\./g, ""); // ponto de milhar
  else normalized = clean;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, frac = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

// 123456 -> "1234,56" (para preencher campos de edição).
export function centsToInput(cents: number) {
  const abs = Math.abs(cents);
  return `${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}
