import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EditMovement } from "@/components/edit-forms";
import { MovementRow } from "@/components/movement-list";
import { QuickAdd } from "@/components/quick-add";
import { QuickText } from "@/components/quick-text";
import { formatDayLabel, formatShort, todayInSaoPaulo } from "@/lib/dates";
import { getFinance, type Movement } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { requireProfile } from "@/lib/profile";
import { paydayText } from "@/lib/cycle";

export const metadata = { title: "Dinheiro" };
export const dynamic = "force-dynamic";

export default async function MoneyPage({ searchParams }: { searchParams: Promise<{ ciclo?: string }> }) {
  const { ciclo } = await searchParams;
  const offset = Math.max(-24, Math.min(0, Number.parseInt(ciclo ?? "0", 10) || 0));
  const profile = await requireProfile();
  const f = await getFinance(profile.cycleStartDay, offset);
  const href = (o: number) => (o === 0 ? "/app/dinheiro" : `/app/dinheiro?ciclo=${o}`);
  const { summary: s, cycle } = f;
  const today = todayInSaoPaulo();

  const byDay = new Map<string, Movement[]>();
  for (const m of f.movements) byDay.set(m.occurredOn, [...(byDay.get(m.occurredOn) ?? []), m]);

  const rows = [
    { label: "Entrou", cents: s.receivedCents, tone: "text-gain" },
    { label: "Saiu", cents: -s.spentCents, tone: "" },
    { label: "Guardado em metas", cents: -s.savedCents, tone: "" },
    { label: "A pagar no ciclo (faturas e contas)", cents: -s.committedCents, tone: "text-sun" },
  ];

  const past = offset < 0;

  return (
    <>
      <QuickText />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <QuickAdd categories={f.categories} cards={f.cards} variant="expense" />
        <QuickAdd categories={f.categories} cards={f.cards} variant="income" />
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 px-1">
        <Link
          href={href(offset - 1)}
          aria-label="Ciclo anterior"
          className={`grid h-9 w-9 place-items-center rounded-full hover:bg-white/[0.06] ${offset <= -24 ? "pointer-events-none opacity-30" : ""}`}
        >
          <ChevronLeft size={18} aria-hidden />
        </Link>
        <p className="text-sm font-semibold">
          {offset === 0 ? "Ciclo atual" : offset === -1 ? "Ciclo passado" : `${-offset} ciclos atrás`}
          {past ? (
            <span className="ml-2 font-normal text-ink-soft">
              {formatShort(cycle.start)} a {formatShort(cycle.end)}
            </span>
          ) : null}
        </p>
        <Link
          href={href(offset + 1)}
          aria-label="Próximo ciclo"
          className={`grid h-9 w-9 place-items-center rounded-full hover:bg-white/[0.06] ${offset >= 0 ? "pointer-events-none opacity-30" : ""}`}
        >
          <ChevronRight size={18} aria-hidden />
        </Link>
      </div>

      <section className="glass mt-2 rounded-[1.75rem] px-5 py-3">
        {byDay.size ? (
          [...byDay.entries()].map(([day, items]) => (
            <div key={day} className="py-2">
              <h2 className="pt-2 text-[13px] font-semibold text-ink-soft">{formatDayLabel(day, today)}</h2>
              <ul className="divide-y divide-white/[0.06]">
                {items.map((m) => (
                  <MovementRow
                    key={`${m.source}-${m.id}`}
                    m={m}
                    today={today}
                    deletable
                    edit={<EditMovement m={m} categories={f.categories} cards={f.cards} />}
                  />
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

      <section className="glass mt-5 rounded-[1.75rem] p-5">
        {past ? (
          <p className="text-sm text-ink-soft">
            Resumo de {formatShort(cycle.start)} a {formatShort(cycle.end)}
          </p>
        ) : (
          <p className="text-sm font-semibold">{paydayText(cycle)}</p>
        )}
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
            <dt className="font-semibold">
              {past ? "Sobrou no ciclo" : s.freeCents < 0 ? "Faltando no ciclo" : "Pode gastar por dia"}
            </dt>
            <dd className={`font-display text-2xl font-bold ${s.freeCents < 0 ? "text-loss" : "metal-text"}`}>
              {formatCents(past || s.freeCents < 0 ? s.freeCents : s.perDayCents)}
            </dd>
          </div>
        </dl>
        {!past && s.toReceiveCents > 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            Ainda vai entrar neste ciclo: <strong className="text-gain">{formatCents(s.toReceiveCents)}</strong>
          </p>
        ) : null}
      </section>
    </>
  );
}
