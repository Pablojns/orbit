import Link from "next/link";
import { formatCents } from "@/lib/money";

// Faixa do topo do Dinheiro: Saldo e Fatura aberta.
// "Pode gastar por dia", "Faltando no ciclo" e "A pagar no ciclo" ficam só no resumo do ciclo,
// para cada número aparecer uma vez na tela (Rodada 3).
export function MoneyStrip({
  balanceCents,
  openStatementCents,
  hasCards,
}: {
  balanceCents: number;
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
    ...(hasCards
      ? [{ label: "Fatura aberta", value: formatCents(openStatementCents), tone: "", href: "/app/dinheiro/cartoes" }]
      : []),
  ];
  return (
    <div className={`glass grid divide-x divide-white/[0.08] rounded-3xl ${hasCards ? "grid-cols-2" : "grid-cols-1"}`}>
      {items.map((it) => (
        <Link key={it.label} href={it.href} className="min-w-0 px-4 py-3 hover:bg-white/[0.03]">
          <p className="truncate text-[12px] text-ink-soft">{it.label}</p>
          <p className={`font-display truncate text-lg font-bold ${it.tone}`}>{it.value}</p>
        </Link>
      ))}
    </div>
  );
}
