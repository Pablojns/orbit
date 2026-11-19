import { CreditCard, PiggyBank, Receipt } from "lucide-react";
import { MovementRow } from "@/components/movement-list";
import { PageHeader } from "@/components/page-header";
import { QuickAdd } from "@/components/quick-add";
import { formatDayLabel, formatShort } from "@/lib/dates";
import { getCategories, getCycleSummary, type Movement } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { requireProfile } from "@/lib/profile";

export const metadata = { title: "Dinheiro" };
export const dynamic = "force-dynamic";

const SOON = [
  { icon: CreditCard, title: "Cartões e faturas", text: "Parcelas caindo sozinhas na fatura certa." },
  { icon: Receipt, title: "Contas fixas", text: "Aluguel, luz e internet com aviso de vencimento." },
  { icon: PiggyBank, title: "Reserva de emergência", text: "Quanto você guardou e quanto falta." },
];

export default async function MoneyPage() {
  const profile = await requireProfile();
  const [summary, categories] = await Promise.all([getCycleSummary(profile.cycleStartDay), getCategories()]);
  const { cycle, today } = summary;

  const byDay = new Map<string, Movement[]>();
  for (const m of summary.movements) {
    byDay.set(m.occurredOn, [...(byDay.get(m.occurredOn) ?? []), m]);
  }

  return (
    <>
      <PageHeader title="Dinheiro" subtitle={`Ciclo de ${formatShort(cycle.start)} a ${formatShort(cycle.end)}`} />

      <section className="glass grid grid-cols-3 gap-2 rounded-[1.75rem] p-4 text-center">
        <div>
          <p className="text-xs text-ink-soft">Entrou</p>
          <p className="font-display mt-1 text-[1.05rem] font-bold text-gain">{formatCents(summary.incomeCents)}</p>
        </div>
        <div className="border-x border-white/10">
          <p className="text-xs text-ink-soft">Saiu</p>
          <p className="font-display mt-1 text-[1.05rem] font-bold">{formatCents(summary.expenseCents)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-soft">Livre</p>
          <p
            className={`font-display mt-1 text-[1.05rem] font-bold ${summary.freeCents < 0 ? "text-loss" : "metal-text"}`}
          >
            {formatCents(summary.freeCents)}
          </p>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <QuickAdd categories={categories} variant="expense" />
        <QuickAdd categories={categories} variant="income" />
      </div>

      <section className="glass mt-5 rounded-[1.75rem] px-5 py-3">
        {byDay.size ? (
          [...byDay.entries()].map(([day, items]) => (
            <div key={day} className="py-2">
              <h2 className="pt-2 text-[13px] font-semibold text-ink-soft">{formatDayLabel(day, today)}</h2>
              <ul className="divide-y divide-white/[0.06]">
                {items.map((m) => (
                  <MovementRow key={m.id} m={m} today={today} deletable />
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="py-4 text-[15px] leading-relaxed text-ink-soft">
            Nenhuma movimentação neste ciclo. Use os botões acima para lançar a primeira.
          </p>
        )}
      </section>

      <h2 className="mt-8 text-lg font-semibold">Chegando nas próximas versões</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {SOON.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-4">
            <Icon size={20} className="text-cobalt" aria-hidden />
            <p className="mt-3 text-[15px] font-semibold">{title}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{text}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
