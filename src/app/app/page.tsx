import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, ChevronRight, Flame, Sparkles } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { MovementRow } from "@/components/movement-list";
import { OrbitRing } from "@/components/orbit-ring";
import { QuickAdd } from "@/components/quick-add";
import { formatShort } from "@/lib/dates";
import { getCategories, getCycleSummary } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { requireProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(
      new Date(),
    ),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function HomePage() {
  const profile = await requireProfile();
  const [summary, categories] = await Promise.all([getCycleSummary(profile.cycleStartDay), getCategories()]);
  const { cycle, today } = summary;
  const firstName = profile.displayName?.split(" ")[0];
  const hasData = summary.movements.length > 0;
  const negative = summary.freeCents < 0;
  const spentShare = summary.incomeCents > 0 ? Math.min(100, (summary.expenseCents / summary.incomeCents) * 100) : 0;
  const topCategories = summary.byCategory.slice(0, 5);
  const maxCategory = topCategories[0]?.cents ?? 1;

  return (
    <div className="space-y-5 pt-7 lg:pt-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] text-ink-soft">{firstName ? `${greeting()}, ${firstName}` : greeting()}</p>
          <h1 className="mt-1 text-[1.9rem] leading-tight font-bold">
            Dia {cycle.dayNumber} de {cycle.totalDays}
          </h1>
          <p className="text-sm text-ink-soft">
            Ciclo de {formatShort(cycle.start)} a {formatShort(cycle.end)}
          </p>
        </div>
        <Link
          href="/app/perfil"
          aria-label="Perfil"
          className="font-display grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-gradient-to-br from-white/25 to-white/5 text-lg font-bold"
        >
          <span className="metal-text">{(firstName?.[0] ?? "O").toUpperCase()}</span>
        </Link>
      </header>

      <div className="space-y-5 lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-5 lg:space-y-0">
        {/* Painel principal */}
        <section className="glass rounded-[2rem] px-5 pt-6 pb-5">
          <OrbitRing cycle={cycle}>
            <span className="text-[13px] text-ink-soft">
              {negative ? "Passou do que entrou" : "Livre até o próximo ciclo"}
            </span>
            <span
              className={`font-display mt-1 text-[2.15rem] leading-none font-bold ${negative ? "text-loss" : "metal-text"}`}
            >
              {formatCents(summary.freeCents)}
            </span>
            <span className="mt-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-ink-soft">
              {cycle.daysLeft === 0 ? "Último dia do ciclo" : `${cycle.daysLeft} dias restantes`}
            </span>
          </OrbitRing>

          {hasData && !negative ? (
            <p className="mt-2 text-center text-sm text-ink-soft">
              Dá para gastar <strong className="text-ink">{formatCents(summary.perDayCents)} por dia</strong> até o fim
              do ciclo.
            </p>
          ) : null}
          {!hasData ? (
            <p className="mt-2 text-center text-sm text-ink-soft">Lance o que entrou e o que saiu neste ciclo.</p>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <p className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                <ArrowDownLeft size={15} className="text-gain" aria-hidden /> Entrou
              </p>
              <p className="font-display mt-1 text-xl font-bold">{formatCents(summary.incomeCents)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <p className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                <ArrowUpRight size={15} className="text-loss" aria-hidden /> Saiu
              </p>
              <p className="font-display mt-1 text-xl font-bold">{formatCents(summary.expenseCents)}</p>
            </div>
          </div>

          {summary.incomeCents > 0 ? (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-ink-soft">
                <span>Você já usou {Math.round(spentShare)}% do que entrou</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={`h-full rounded-full ${spentShare >= 90 ? "bg-loss" : "grad-primary"}`}
                  style={{ width: `${spentShare}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <QuickAdd categories={categories} variant="expense" />
            <QuickAdd categories={categories} variant="income" />
          </div>
        </section>

        <div className="space-y-5">
          {/* Para onde foi */}
          <section className="glass rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold">Para onde foi o dinheiro</h2>
            {topCategories.length ? (
              <ul className="mt-4 space-y-3.5">
                {topCategories.map((c) => (
                  <li key={c.name}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06]">
                        <CategoryIcon name={c.icon} size={17} />
                      </span>
                      <span className="flex-1 text-[15px]">{c.name}</span>
                      <span className="text-[15px] font-semibold">{formatCents(c.cents)}</span>
                    </div>
                    <div className="mt-2 ml-12 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="grad-primary h-full rounded-full"
                        style={{ width: `${(c.cents / maxCategory) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                Quando você lançar gastos, as categorias que mais pesam aparecem aqui.
              </p>
            )}
          </section>

          {/* Últimas movimentações */}
          <section className="glass rounded-[2rem] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Últimas movimentações</h2>
              {hasData ? (
                <Link href="/app/dinheiro" className="flex items-center text-sm font-medium text-cobalt">
                  Ver tudo <ChevronRight size={16} aria-hidden />
                </Link>
              ) : null}
            </div>
            {hasData ? (
              <ul className="mt-1 divide-y divide-white/[0.06]">
                {summary.movements.slice(0, 5).map((m) => (
                  <MovementRow key={m.id} m={m} today={today} />
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                Nada lançado neste ciclo ainda. Comece pela entrada do seu salário.
              </p>
            )}
          </section>

          {/* Rotina */}
          <section className="grid grid-cols-2 gap-3">
            <Link href="/app/agenda" className="glass rounded-[1.5rem] p-4">
              <CalendarClock size={20} className="text-sun" aria-hidden />
              <p className="mt-3 text-[15px] font-semibold">Prazos</p>
              <p className="text-[13px] text-ink-soft">Nenhum nos próximos dias</p>
            </Link>
            <Link href="/app/habitos" className="glass rounded-[1.5rem] p-4">
              <Flame size={20} className="text-loss" aria-hidden />
              <p className="mt-3 text-[15px] font-semibold">Hábitos</p>
              <p className="text-[13px] text-ink-soft">Nenhum para hoje</p>
            </Link>
          </section>

          {hasData && summary.byCategory[0] ? (
            <section className="flex items-start gap-3 rounded-[1.5rem] border border-sun/25 bg-sun/[0.07] p-4">
              <Sparkles size={20} className="mt-0.5 shrink-0 text-sun" aria-hidden />
              <p className="text-sm leading-relaxed">
                <strong>{summary.byCategory[0].name}</strong> é onde mais saiu dinheiro neste ciclo:{" "}
                {summary.expenseCents > 0
                  ? `${Math.round((summary.byCategory[0].cents / summary.expenseCents) * 100)}% de tudo que você gastou.`
                  : ""}
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
