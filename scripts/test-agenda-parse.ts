import { parseAgendaText } from "../src/lib/agenda-parse";
const today = { year: 2026, month: 11, day: 20 }; // sexta
const cases: [string, Record<string, unknown> | null][] = [
  ["prova facul sexta algoritmo e lógica", { kind: "exam", title: "Prova: algoritmo e lógica", date: "2026-11-20", time: null }],
  ["prova segunda 19h algoritmo", { kind: "exam", date: "2026-11-23", time: "19:00", title: "Prova: algoritmo" }],
  ["entrega do trabalho dia 28 23h", { kind: "deadline", date: "2026-11-28", time: "23:00" }],
  ["dentista amanhã 14h30", { kind: "appointment", title: "Dentista", date: "2026-11-21", time: "14:30" }],
  ["reunião 02/12 às 9", { kind: "appointment", date: "2026-12-02", time: "09:00" }],
  ["aniversário da mãe dia 3", { kind: "other", date: "2026-12-03", title: "Aniversário da mãe" }],
  ["prova quarta 15 hrs", { kind: "exam", date: "2026-11-25", time: "15:00", title: "Prova" }],
  ["prova quarta 15", { kind: "exam", date: "2026-11-25", time: "15:00" }],
  ["prova quarta 15hrs calculo", { kind: "exam", time: "15:00", title: "Prova: calculo" }],
  ["reunião amanhã 9 horas", { time: "09:00", date: "2026-11-21" }],
  ["mercado 45 pix", null],
  ["ifood 42 ontem", null],
  ["mercado 45 amanhã", null],
];
let fail = 0;
for (const [t, exp] of cases) {
  const r = parseAgendaText(t, today) as Record<string, unknown> | null;
  if (exp === null) { if (r) { fail++; console.log("FALHOU (devia ser dinheiro)", t, r); } continue; }
  if (!r) { fail++; console.log("FALHOU nulo", t); continue; }
  for (const [k, v] of Object.entries(exp)) if (r[k] !== v) { fail++; console.log("FALHOU", t, k, r[k], "!=", v); }
  console.log("ok:", r.summary);
}
console.log(fail ? `${fail} falhas` : "todas passaram");
process.exit(fail ? 1 : 0);
