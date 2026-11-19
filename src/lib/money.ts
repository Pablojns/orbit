// Dinheiro sempre em centavos (inteiro). Nunca use float para somar valores.
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCents(cents: number) {
  return brl.format(cents / 100);
}

// "1.234,56" | "1234,56" | "1234.56" | "12" -> centavos. Retorna null se inválido.
export function parseToCents(input: string): number | null {
  const clean = input.replace(/[R$\s]/g, "");
  if (!clean) return null;
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, frac = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
