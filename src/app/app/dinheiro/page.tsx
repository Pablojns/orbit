import Link from "next/link";
import { EditMovement } from "@/components/edit-forms";
import { MovementRow } from "@/components/movement-list";
import { QuickAdd } from "@/components/quick-add";
import { formatDayLabel, todayInSaoPaulo, toISODate } from "@/lib/dates";
import { getFinance, type Movement } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { requireProfile } from "@/lib/profile";
import { periodLabel, periodRange } from "@/lib/period";
import { PeriodPicker } from "@/components/period-picker";

export const metadata = { title: "Extrato" };
export const dynamic = "force-dynamic";

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{
    periodo?: string;
    de?: string;
    ate?: string;
    q?: string;
    tipo?: string;
    cat?: string;
  }>;
}) {
  const { periodo, de, ate, q = "", tipo = "", cat = "" } = await searchParams;
  const profile = await requireProfile();
  const today = todayInSaoPaulo();
  const period = periodRange(periodo, today, profile.cycleStartDay, de, ate);
  const f = await getFinance(profile.cycleStartDay, 0, {
    start: period.start,
    end: period.end,
  });
  const { summary: s } = f;

  // Busca e filtros do extrato (Rodada 8): texto, entrada/gasto e categoria.
  const fold = (t: string) =>
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const query = fold(q.trim());
  const filtered = f.movements.filter(
    (m) =>
      (!query ||
        fold(
          `${m.description ?? ""} ${m.category?.name ?? ""} ${m.cardName ?? ""}`,
        ).includes(query)) &&
      (tipo !== "entrada" || m.type === "income") &&
      (tipo !== "gasto" || m.type === "expense") &&
      (!cat || (m.category?.name ?? "Sem categoria") === cat),
  );
  const filtering = Boolean(query || tipo || cat);
  const filteredTotal = filtered.reduce(
    (a, m) => a + (m.type === "income" ? m.amountCents : -m.amountCents),
    0,
  );
  const catNames = [
    ...new Set(f.movements.map((m) => m.category?.name ?? "Sem categoria")),
  ].sort();

  const byDay = new Map<string, Movement[]>();
  for (const m of filtered)
    byDay.set(m.occurredOn, [...(byDay.get(m.occurredOn) ?? []), m]);

  const expenses = filtered.filter((m) => m.type === "expense");
  const incomes = filtered.filter((m) => m.type === "income");
  const biggest = (list: Movement[]) => {
    const by = new Map<string, number>();
    for (const m of list) {
      const k = m.category?.name ?? "Sem categoria";
      by.set(k, (by.get(k) ?? 0) + m.amountCents);
    }
    return [...by.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  };
  const bigOut = biggest(expenses);
  const bigIn = biggest(incomes);
  const keep = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (period.kind !== "ciclo") p.set("periodo", period.kind);
    if (period.kind === "personalizado") {
      p.set("de", toISODate(period.start));
      p.set("ate", toISODate(period.end));
    }
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/app/dinheiro?${qs}` : "/app/dinheiro";
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PeriodPicker
          kind={period.kind}
          de={toISODate(period.start)}
          ate={toISODate(period.end)}
        />
        <span className="text-[13px] text-ink-soft">
          {periodLabel(period.start, period.end)}
        </span>
        <div className="ml-auto flex gap-2">
          <QuickAdd
            categories={f.categories}
            cards={f.cards}
            variant="expense"
          />
          <QuickAdd
            categories={f.categories}
            cards={f.cards}
            variant="income"
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2.5 lg:gap-4">
        <Link
          href={keep({ tipo: "gasto" })}
          className="glass rounded-2xl p-3.5 hover:bg-white/[0.03] lg:p-4"
        >
          <p className="text-xs font-bold text-ink-soft">Saídas</p>
          <p className="mt-1 text-[15px] font-extrabold lg:text-lg">
            {expenses.length}{" "}
            {expenses.length === 1 ? "lançamento" : "lançamentos"}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-ink-soft lg:text-[13px]">
            {bigOut ? `mais em ${bigOut[0]}` : "nenhuma"}
          </p>
        </Link>
        <Link
          href={keep({ tipo: "entrada" })}
          className="glass rounded-2xl p-3.5 hover:bg-white/[0.03] lg:p-4"
        >
          <p className="text-xs font-bold text-ink-soft">Entradas</p>
          <p className="mt-1 text-[15px] font-extrabold lg:text-lg">
            {incomes.length}{" "}
            {incomes.length === 1 ? "lançamento" : "lançamentos"}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-ink-soft lg:text-[13px]">
            {bigIn ? `mais em ${bigIn[0]}` : "nenhuma"}
          </p>
        </Link>
        <div className="hero-card rounded-2xl p-3.5 lg:p-4">
          <p className="text-xs font-bold text-[#b9c2f5]">Resumo</p>
          <dl className="mt-1 space-y-0.5 text-[12px] lg:text-[13px]">
            <div className="flex justify-between gap-2">
              <dt className="text-[#c7cff7]">Entrou</dt>
              <dd className="font-extrabold">{formatCents(s.receivedCents)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#c7cff7]">Saiu</dt>
              <dd className="font-extrabold">{formatCents(s.spentCents)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#c7cff7]">Metas</dt>
              <dd className="font-extrabold">{formatCents(s.savedCents)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <form
        method="get"
        className="mt-3 flex flex-wrap gap-2"
        role="search"
        aria-label="Buscar no extrato"
      >
        {period.kind !== "ciclo" ? (
          <input type="hidden" name="periodo" value={period.kind} />
        ) : null}
        {period.kind === "personalizado" ? (
          <>
            <input type="hidden" name="de" value={toISODate(period.start)} />
            <input type="hidden" name="ate" value={toISODate(period.end)} />
          </>
        ) : null}
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar (ex.: ifood, uber)"
          aria-label="Buscar no extrato"
          className="h-11 min-w-0 flex-[2] rounded-xl border border-white/[0.1] bg-[#0f1634] px-3.5 text-[15px] outline-none placeholder:text-white/35 focus:border-[#a78bfa]"
        />
        <select
          name="tipo"
          defaultValue={tipo}
          aria-label="Tipo"
          className="h-11 flex-1 rounded-xl border border-white/[0.1] bg-[#0f1634] px-3 text-[15px]"
        >
          <option value="">Tudo</option>
          <option value="gasto">Gastos</option>
          <option value="entrada">Entradas</option>
        </select>
        <select
          name="cat"
          defaultValue={cat}
          aria-label="Categoria"
          className="h-11 flex-1 rounded-xl border border-white/[0.1] bg-[#0f1634] px-3 text-[15px]"
        >
          <option value="">Todas as categorias</option>
          {catNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="grad-primary h-11 rounded-xl px-4 text-sm font-bold text-white"
        >
          Filtrar
        </button>
      </form>
      {filtering ? (
        <p className="mt-2 flex items-center justify-between gap-3 text-sm text-ink-soft">
          <span>
            {filtered.length}{" "}
            {filtered.length === 1 ? "lançamento" : "lançamentos"}, saldo dos
            filtrados{" "}
            <strong className="text-ink">{formatCents(filteredTotal)}</strong>
          </span>
          <Link href={keep({})} className="font-bold text-[#a78bfa]">
            Limpar
          </Link>
        </p>
      ) : null}

      <section className="glass mt-2 rounded-3xl px-5 py-3">
        {byDay.size ? (
          [...byDay.entries()].map(([day, items]) => (
            <div key={day} className="py-2">
              <h2 className="pt-2 text-[13px] font-semibold text-ink-soft">
                {formatDayLabel(day, today)}
              </h2>
              <ul className="divide-y divide-white/[0.06]">
                {items.map((m) => (
                  <MovementRow
                    key={`${m.source}-${m.id}`}
                    m={m}
                    today={today}
                    deletable
                    edit={
                      m.source === "bill_payment" ? null : (
                        <EditMovement
                          m={m}
                          categories={f.categories}
                          cards={f.cards}
                        />
                      )
                    }
                  />
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="py-4 text-[15px] leading-relaxed text-ink-soft">
            {filtering
              ? "Nada encontrado com esses filtros."
              : "Nada lançado neste período."}
          </p>
        )}
      </section>
    </>
  );
}
