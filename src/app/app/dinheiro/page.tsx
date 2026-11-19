import { MovementRow } from "@/components/movement-list";
import { QuickAdd } from "@/components/quick-add";
import { formatDayLabel, formatShort } from "@/lib/dates";
import { getFinance, type Movement } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { requireProfile } from "@/lib/profile";

export const metadata = { title: "Dinheiro" };
export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  const profile = await requireProfile();
  const f = await getFinance(profile.cycleStartDay);
  const { summary: s, cycle, today } = f;

  const byDay = new Map<string, Movement[]>();
  for (const m of f.movements) byDay.set(m.occurredOn, [...(byDay.get(m.occurredOn) ?? []), m]);

  const rows = [
    { label: "Entrou", cents: s.receivedCents, tone: "text-gain" },
    { label: "Saiu", cents: -s.spentCents, tone: "" },
    { label: "Guardado em metas", cents: -s.savedCents, tone: "" },
    { label: "A pagar no ciclo (faturas e contas)", cents: -s.committedCents, tone: "text-sun" },
  ];

  return (
    <>
      <section className="glass rounded-[1.75rem] p-5">
        <p className="text-sm text-ink-soft">
          Ciclo de {formatShort(cycle.start)} a {formatShort(cycle.end)}
        </p>
        <dl className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-[15px]">
              <dt className="text-ink-soft">{r.label}</dt>
              <dd className={`font-semibold ${r.tone}`}>
                {r.cents < 0 ? "− " : ""}
                {formatCents(Math.abs(r.cents))}
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <dt className="font-semibold">Livre de verdade</dt>
            <dd className={`font-display text-2xl font-bold ${s.freeCents < 0 ? "text-loss" : "metal-text"}`}>
              {formatCents(s.freeCents)}
            </dd>
          </div>
        </dl>
        {s.toReceiveCents > 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            Ainda vai entrar neste ciclo: <strong className="text-gain">{formatCents(s.toReceiveCents)}</strong>
          </p>
        ) : null}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <QuickAdd categories={f.categories} cards={f.cards} variant="expense" />
        <QuickAdd categories={f.categories} cards={f.cards} variant="income" />
      </div>

      <section className="glass mt-5 rounded-[1.75rem] px-5 py-3">
        {byDay.size ? (
          [...byDay.entries()].map(([day, items]) => (
            <div key={day} className="py-2">
              <h2 className="pt-2 text-[13px] font-semibold text-ink-soft">{formatDayLabel(day, today)}</h2>
              <ul className="divide-y divide-white/[0.06]">
                {items.map((m) => (
                  <MovementRow key={`${m.source}-${m.id}`} m={m} today={today} deletable />
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
    </>
  );
}
