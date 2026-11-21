import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDashed,
  CreditCard,
  Flame,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { finishOnboarding, receiveIncome } from "@/app/app/actions";
import { CategoryIcon } from "@/components/category-icon";
import { countdown, EventRow } from "@/components/event-row";
import { HabitCheck } from "@/components/habit-card";
import { MovementRow } from "@/components/movement-list";
import { OrbitRing } from "@/components/orbit-ring";
import { QuickAdd } from "@/components/quick-add";
import { QuickText } from "@/components/quick-text";
import { diffInDays, formatShort } from "@/lib/dates";
import { getFinance } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { requireProfile } from "@/lib/profile";
import { getAgenda, getHabits } from "@/lib/routine";

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
  const [f, agenda, habits] = await Promise.all([getFinance(profile.cycleStartDay), getAgenda(), getHabits()]);
  const { cycle, today, summary: s } = f;
  const firstName = profile.displayName?.split(" ")[0];
  const negative = s.freeCents < 0;
  const hasMoney = s.receivedCents > 0 || f.movements.length > 0 || s.committedCents > 0;

  // A pagar neste ciclo (faturas e contas ainda não pagas), por data.
  const dues = [
    ...f.statements
      .filter(
        (st) =>
          st.status !== "paid" && diffInDays(st.dueDate, cycle.end) >= 0 && diffInDays(cycle.start, st.dueDate) >= 0,
      )
      .map((st) => ({
        key: `c-${st.cardId}-${st.month}`,
        name: `Fatura ${st.cardName}`,
        cents: st.remainingCents,
        date: st.dueDate,
        card: true,
      })),
    ...f.billsInCycle
      .filter((b) => !b.paid)
      .map((b) => ({
        key: `b-${b.billId}-${b.referenceMonth}`,
        name: b.name,
        cents: b.amountCents,
        date: b.dueDate,
        card: false,
      })),
  ].sort((a, b) => diffInDays(b.date, a.date));

  const pendingIncomes = f.incomesInCycle.filter((i) => !i.received);
  const nextEvents = agenda.upcoming.filter((e) => e.daysLeft >= 1 && e.daysLeft <= 7).slice(0, 5);

  // "Seu dia": o que é para hoje ou já passou, de tudo junto.
  const todayEvents = [...agenda.overdue, ...agenda.upcoming.filter((e) => e.daysLeft === 0)];
  const todayISO = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
  const todayTasks = agenda.tasks.filter((t) => !t.done && t.dueOn && t.dueOn <= todayISO);
  const todayDues = dues.filter((d) => diffInDays(today, d.date) <= 0);
  const weekExams = agenda.upcoming.filter((e) => e.kind === "exam" && e.daysLeft <= 7).length;
  const dayCount = todayEvents.length + todayTasks.length + todayDues.length;
  const topCategories = s.byCategory.slice(0, 5);
  const maxCategory = topCategories[0]?.cents ?? 1;
  const categoryTotal = s.byCategory.reduce((a, c) => a + c.cents, 0);
  const { thisWeekCents, lastWeekCents } = s.week;
  const weekDelta = lastWeekCents > 0 ? Math.round(((thisWeekCents - lastWeekCents) / lastWeekCents) * 100) : null;

  const steps = [
    { done: profile.cycleStartDay !== 1, label: "Defina o dia em que seu dinheiro entra", href: "/app/perfil" },
    { done: f.incomes.length > 0, label: "Cadastre seu salário como entrada fixa", href: "/app/dinheiro/contas" },
    { done: f.cards.length > 0, label: "Cadastre seu cartão de crédito", href: "/app/dinheiro/cartoes" },
    { done: f.bills.length > 0, label: "Cadastre suas contas fixas", href: "/app/dinheiro/contas" },
  ];
  const showSteps = !profile.onboarded && steps.some((x) => !x.done);

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

      {showSteps ? (
        <section className="glass rounded-[1.75rem] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Primeiros passos</h2>
            <form action={finishOnboarding}>
              <button type="submit" className="text-xs text-ink-soft hover:text-ink">
                Esconder
              </button>
            </form>
          </div>
          <p className="mt-1 text-sm text-ink-soft">Com isso, o Dimeta calcula sozinho quanto você pode gastar.</p>
          <ol className="mt-3 space-y-1">
            {steps.map((step) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-white/[0.04]"
                >
                  {step.done ? (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-gain text-[#05201a]">
                      <Check size={14} strokeWidth={3} aria-hidden />
                    </span>
                  ) : (
                    <CircleDashed size={24} className="text-ink-soft" aria-hidden />
                  )}
                  <span className={`flex-1 text-[15px] ${step.done ? "text-ink-soft line-through" : ""}`}>
                    {step.label}
                  </span>
                  {!step.done ? <ChevronRight size={16} className="text-ink-soft" aria-hidden /> : null}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="glass rounded-[1.75rem] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Seu dia</h2>
          <Link href="/app/agenda" className="flex items-center text-sm font-medium text-cobalt">
            Agenda <ChevronRight size={16} aria-hidden />
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/[0.06] px-3 py-1">
            {dayCount ? `${dayCount} para hoje` : "Nada pendente para hoje"}
          </span>
          {weekExams ? (
            <span className="rounded-full bg-cobalt/15 px-3 py-1 text-cobalt">
              {weekExams} {weekExams === 1 ? "prova" : "provas"} nos próximos 7 dias
            </span>
          ) : null}
          {hasMoney && !negative ? (
            <span className="rounded-full bg-gain/15 px-3 py-1 text-gain">
              Pode gastar {formatCents(s.perDayCents)} hoje
            </span>
          ) : null}
          {habits.length ? (
            <span className="rounded-full bg-sun/15 px-3 py-1 text-sun">
              Hábitos {habits.filter((h) => h.checkedToday).length}/{habits.length}
            </span>
          ) : null}
        </div>
        {dayCount ? (
          <ul className="mt-2 divide-y divide-white/[0.06]">
            {todayEvents.map((e) => (
              <EventRow key={e.id} e={e} compact />
            ))}
            {todayTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/[0.06]">
                  <Check size={18} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{t.title}</p>
                  <p className={`text-[13px] ${t.dueOn! < todayISO ? "text-loss" : "text-ink-soft"}`}>
                    Tarefa, {t.dueOn! < todayISO ? "atrasada" : "para hoje"}
                  </p>
                </div>
              </li>
            ))}
            {todayDues.map((d) => (
              <li key={d.key} className="flex items-center gap-3 py-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sun/15 text-sun">
                  {d.card ? <CreditCard size={18} aria-hidden /> : <Receipt size={18} aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{d.name}</p>
                  <p className={`text-[13px] ${diffInDays(today, d.date) < 0 ? "text-loss" : "text-sun"}`}>
                    {diffInDays(today, d.date) < 0 ? "Vencida" : "Vence hoje"}
                  </p>
                </div>
                <p className="text-[15px] font-semibold">{formatCents(d.cents)}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <QuickText />

      <div className="space-y-5 lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-5 lg:space-y-0">
        <div className="space-y-5">
          <section className="glass rounded-[2rem] px-5 pt-6 pb-5">
            <OrbitRing cycle={cycle}>
              <span className="text-[13px] text-ink-soft">
                {negative ? "Faltando no ciclo" : "Livre até o próximo ciclo"}
              </span>
              <span
                className={`font-display mt-1 text-[2.15rem] leading-none font-bold ${negative ? "text-loss" : "metal-text"}`}
              >
                {formatCents(s.freeCents)}
              </span>
              <span className="mt-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-ink-soft">
                {cycle.daysLeft === 0 ? "Último dia do ciclo" : `${cycle.daysLeft} dias restantes`}
              </span>
            </OrbitRing>

            <p className="mt-2 text-center text-sm text-ink-soft">
              {!hasMoney ? (
                "Lance o que entrou e o que saiu neste ciclo."
              ) : negative ? (
                "As contas e faturas do ciclo passam do que entrou. Veja o que dá para adiar."
              ) : (
                <>
                  Dá para gastar <strong className="text-ink">{formatCents(s.perDayCents)} por dia</strong> até o fim do
                  ciclo.
                </>
              )}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="flex items-center gap-1 text-[12px] text-ink-soft">
                  <ArrowDownLeft size={14} className="text-gain" aria-hidden /> Entrou
                </p>
                <p className="font-display mt-1 text-[15px] font-bold">{formatCents(s.receivedCents)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="flex items-center gap-1 text-[12px] text-ink-soft">
                  <ArrowUpRight size={14} className="text-loss" aria-hidden /> Saiu
                </p>
                <p className="font-display mt-1 text-[15px] font-bold">{formatCents(s.spentCents)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="flex items-center gap-1 text-[12px] text-ink-soft">
                  <Receipt size={13} className="text-sun" aria-hidden /> A pagar
                </p>
                <p className="font-display mt-1 text-[15px] font-bold">{formatCents(s.committedCents)}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <QuickAdd categories={f.categories} cards={f.cards} variant="expense" />
              <QuickAdd categories={f.categories} cards={f.cards} variant="income" />
            </div>
          </section>

          {pendingIncomes.length ? (
            <section className="glass rounded-[1.75rem] p-5">
              <h2 className="text-lg font-semibold">Ainda vai entrar</h2>
              <ul className="mt-2 divide-y divide-white/[0.06]">
                {pendingIncomes.map((i) => {
                  const days = diffInDays(today, i.date);
                  return (
                    <li key={`${i.incomeId}-${i.date.month}`} className="flex items-center gap-3 py-3">
                      <div className="flex-1">
                        <p className="text-[15px] font-medium">{i.name}</p>
                        <p className="text-[13px] text-ink-soft">
                          {countdown(days)}, dia {i.date.day}
                        </p>
                      </div>
                      <p className="text-[15px] font-semibold text-gain">{formatCents(i.amountCents)}</p>
                      {days <= 0 ? (
                        <form action={receiveIncome}>
                          <input type="hidden" name="income_id" value={i.incomeId} />
                          <button
                            type="submit"
                            className="rounded-full bg-gain/90 px-3 py-1.5 text-xs font-semibold text-[#05201a]"
                          >
                            Recebi
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section className="glass rounded-[1.75rem] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">A pagar neste ciclo</h2>
              <Link href="/app/dinheiro/contas" className="flex items-center text-sm font-medium text-cobalt">
                Contas fixas <ChevronRight size={16} aria-hidden />
              </Link>
            </div>
            {dues.length ? (
              <ul className="mt-2 divide-y divide-white/[0.06]">
                {dues.slice(0, 5).map((d) => {
                  const days = diffInDays(today, d.date);
                  return (
                    <li key={d.key} className="flex items-center gap-3 py-3">
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
                          days < 0 ? "bg-loss/15 text-loss" : days <= 3 ? "bg-sun/20 text-sun" : "bg-white/[0.06]"
                        }`}
                      >
                        {d.card ? <CreditCard size={18} aria-hidden /> : <Receipt size={18} aria-hidden />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium">{d.name}</p>
                        <p className={`text-[13px] ${days < 0 ? "text-loss" : "text-ink-soft"}`}>
                          {days < 0 ? "Vencida" : countdown(days)}, dia {d.date.day}
                        </p>
                      </div>
                      <p className="text-[15px] font-semibold">{formatCents(d.cents)}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                {f.bills.length || f.cards.length
                  ? "Tudo pago neste ciclo."
                  : "Cadastre cartões e contas fixas para ver aqui o que vence até o próximo salário."}
              </p>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="glass rounded-[1.75rem] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Hábitos de hoje</h2>
              <Link href="/app/habitos" className="flex items-center text-sm font-medium text-cobalt">
                Todos <ChevronRight size={16} aria-hidden />
              </Link>
            </div>
            {habits.length ? (
              <ul className="mt-3 space-y-2.5">
                {habits.map((h) => (
                  <li key={h.id} className="flex items-center gap-3">
                    <HabitCheck h={h} />
                    <span className={`flex-1 text-[15px] ${h.checkedToday ? "text-ink-soft line-through" : ""}`}>
                      {h.name}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-ink-soft">
                      <Flame size={14} className={h.streak ? "text-sun" : ""} aria-hidden /> {h.streak}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] text-ink-soft">
                Nenhum hábito ainda.{" "}
                <Link href="/app/habitos" className="text-cobalt">
                  Criar o primeiro
                </Link>
              </p>
            )}
          </section>

          <section className="glass rounded-[1.75rem] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Próximos 7 dias</h2>
              <Link href="/app/agenda" className="flex items-center text-sm font-medium text-cobalt">
                Agenda <ChevronRight size={16} aria-hidden />
              </Link>
            </div>
            {nextEvents.length ? (
              <ul className="mt-1 divide-y divide-white/[0.06]">
                {nextEvents.map((e) => (
                  <EventRow key={e.id} e={e} compact />
                ))}
              </ul>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-[15px] text-ink-soft">
                <CalendarClock size={18} aria-hidden /> Nada marcado nos próximos 7 dias.
              </p>
            )}
          </section>

          {thisWeekCents > 0 || lastWeekCents > 0 ? (
            <section className="flex items-start gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              {weekDelta !== null && weekDelta > 0 ? (
                <TrendingUp size={20} className="mt-0.5 shrink-0 text-loss" aria-hidden />
              ) : (
                <TrendingDown size={20} className="mt-0.5 shrink-0 text-gain" aria-hidden />
              )}
              <p className="text-sm leading-relaxed">
                Nos últimos 7 dias você gastou <strong>{formatCents(thisWeekCents)}</strong>
                {weekDelta === null
                  ? "."
                  : weekDelta === 0
                    ? ", o mesmo que na semana anterior."
                    : `, ${Math.abs(weekDelta)}% ${weekDelta > 0 ? "a mais" : "a menos"} que na semana anterior.`}
              </p>
            </section>
          ) : null}

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
            {topCategories[0] && s.byCategory.length > 1 && categoryTotal > 0 ? (
              <p className="mt-4 flex items-start gap-2 rounded-2xl bg-sun/[0.08] p-3 text-sm">
                <Sparkles size={16} className="mt-0.5 shrink-0 text-sun" aria-hidden />
                <span>
                  <strong>{topCategories[0].name}</strong> concentra{" "}
                  {Math.round((topCategories[0].cents / categoryTotal) * 100)}% dos seus gastos neste ciclo.
                </span>
              </p>
            ) : null}
          </section>

          <section className="glass rounded-[2rem] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Últimas movimentações</h2>
              {f.movements.length ? (
                <Link href="/app/dinheiro" className="flex items-center text-sm font-medium text-cobalt">
                  Ver tudo <ChevronRight size={16} aria-hidden />
                </Link>
              ) : null}
            </div>
            {f.movements.length ? (
              <ul className="mt-1 divide-y divide-white/[0.06]">
                {f.movements.slice(0, 5).map((m) => (
                  <MovementRow key={`${m.source}-${m.id}`} m={m} today={today} />
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">Nada lançado neste ciclo ainda.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
