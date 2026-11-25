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
  const [saldo, fatura] = items;
  return (
    <div className="hero-card flex items-end justify-between gap-4 rounded-3xl px-[22px] py-5 lg:px-7">
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-[#b9c2f5]">{saldo.label}</p>
        <p
          className={`mt-0.5 truncate text-[36px] leading-[1.05] font-extrabold tracking-[-0.03em] lg:text-[44px] ${
            balanceCents < 0 ? "text-[#ff9db0]" : ""
          }`}
        >
          {saldo.value}
        </p>
      </div>
      {fatura ? (
        <Link
          href={fatura.href}
          className="shrink-0 rounded-2xl bg-white/[0.08] px-3.5 py-2.5 text-right hover:bg-white/[0.12]"
        >
          <span className="block text-xs font-semibold text-[#c7cff7]">{fatura.label}</span>
          <span className="block text-lg font-extrabold">{fatura.value}</span>
        </Link>
      ) : null}
    </div>
  );
}
