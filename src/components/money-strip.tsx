import Link from "next/link";
import { formatCents } from "@/lib/money";

// Faixa do topo (Início e Dinheiro): Saldo · Pode gastar por dia · Fatura aberta.
// O cartão não entra no "por dia": o que foi no crédito aparece na fatura aberta.
export function MoneyStrip({
  balanceCents,
  perDayCents,
  freeCents,
  openStatementCents,
  hasCards,
}: {
  balanceCents: number;
  perDayCents: number;
  freeCents: number;
  openStatementCents: number;
  hasCards: boolean;
}) {
  const items = [
    {
      label: "Saldo",
      value: formatCents(balanceCents),
      tone: balanceCents < 0 ? "text-loss" : "",
      href: "/app/dinheiro",
    },
    {
      label: freeCents < 0 ? "Faltando no ciclo" : "Pode gastar por dia",
      value: formatCents(freeCents < 0 ? freeCents : perDayCents),
      tone: freeCents < 0 ? "text-loss" : "metal-text",
      href: "/app/dinheiro",
    },
    ...(hasCards
      ? [{ label: "Fatura aberta", value: formatCents(openStatementCents), tone: "", href: "/app/dinheiro/cartoes" }]
      : []),
  ];
  return (
    <div className={`glass grid divide-x divide-white/[0.08] rounded-[1.5rem] ${hasCards ? "grid-cols-3" : "grid-cols-2"}`}>
      {items.map((it) => (
        <Link key={it.label} href={it.href} className="min-w-0 px-4 py-3 hover:bg-white/[0.03]">
          <p className="truncate text-[12px] text-ink-soft">{it.label}</p>
          <p className={`font-display truncate text-lg font-bold ${it.tone}`}>{it.value}</p>
        </Link>
      ))}
    </div>
  );
}
