import Link from "next/link";
import { CalendarClock, Check, ChevronRight, CircleDashed, CreditCard, Flame, Receipt, Sparkles } from "lucide-react";
import { finishOnboarding, receiveIncome } from "@/app/app/actions";
import { CategoryIcon } from "@/components/category-icon";
import { countdown, EventRow } from "@/components/event-row";
import { HabitCheck } from "@/components/habit-card";
import { MovementRow } from "@/components/movement-list";
import { OrbitRing } from "@/components/orbit-ring";
import { diffInDays, formatShort } from "@/lib/dates";
import { paydayText } from "@/lib/cycle";
import { MoneyStrip } from "@/components/money-strip";
import { FirstSalary } from "@/components/first-salary";
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

  // Agenda no Início: só compromissos e rotina, sem pagamentos (decisão de 21/11).
  const todayEvents = agenda.upcoming.filter((e) => e.daysLeft === 0);
  const nextEvents = agenda.upcoming.filter((e) => e.daysLeft >= 1 && e.daysLeft <= 7);
  const topCategories = s.byCategory.slice(0, 5);
  const maxCategory = topCategories[0]?.cents ?? 1;
  const categoryTotal = s.byCategory.reduce((a, c) => a + c.cents, 0);

  const steps = [
    { done: profile.cycleStartDay !== 1, label: "Defina o dia em que seu dinheiro entra", href: "/app/perfil" },
    { done: f.incomes.length > 0, label: "Cadastre seu salário como entrada fixa", href: "/app/dinheiro/contas" },
    { done: f.cards.length > 0, label: "Cadastre seu cartão de crédito", href: "/app/dinheiro/cartoes" },
    { done: f.bills.length > 0, label: "Cadastre suas contas fixas", href: "/app/dinheiro/contas" },
  ];
  const showSteps = !profile.onboarded && steps.some((x) => !x.done);

  const blockHead = (title: string, href: string, link: string) => (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Link href={href} className="flex items-center text-sm font-medium text-cobalt">
        {link} <ChevronRight size={16} aria-hidden />
      </Link>
    </div>
  );

  return (
    <div className="space-y-5 pt-4 lg:pt-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-[1.6rem] leading-tight font-bold">
          {firstName ? `${greeting()}, ${firstName}` : greeting()}
        </h1>
        <Link
          href="/app/perfil"
          aria-label="Perfil"
          className="font-display grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-gradient-to-br from-white/25 to-white/5 text-lg font-bold"
        >
          <span className="metal-text">{(firstName?.[0] ?? "O").toUpperCase()}</span>
        </Link>
      </header>

      {/* 1. A barra de escrever e falar fica fixa no topo (layout do app) */}
      <MoneyStrip
        balanceCents={s.balanceCents}
        perDayCents={s.perDayCents}
        freeCents={s.freeCents}
        openStatementCents={s.openStatementCents}
        hasCards={f.cards.length > 0}
      />
      {!s.hasAnyIncome ? <FirstSalary dayLabel={formatShort(cycle.start)} /> : null}
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

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 2. Agenda: hoje em cima, próximos 7 dias embaixo */}
        <section className="glass rounded-[1.75rem] p-5">
          {blockHead("Agenda", "/app/agenda", "Agenda")}
          <p className="mt-3 text-sm font-semibold text-ink-soft">Hoje</p>
          {todayEvents.length ? (
            <ul className="divide-y divide-white/[0.06]">
              {todayEvents.map((e) => (
                <EventRow key={e.id} e={e} compact />
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[15px] text-ink-soft">Nada marcado para hoje.</p>
          )}
          <p className="mt-4 text-sm font-semibold text-ink-soft">Próximos 7 dias</p>
          {nextEvents.length ? (
            <ul className="divide-y divide-white/[0.06]">
              {nextEvents.map((e) => (
                <EventRow key={e.id} e={e} compact />
              ))}
            </ul>
          ) : (
            <p className="mt-1 flex items-center gap-2 text-[15px] text-ink-soft">
              <CalendarClock size={18} aria-hidden /> Nada marcado nos próximos 7 dias.
            </p>
          )}
        </section>

        {/* 3. Anel */}
        <section className="glass rounded-[2rem] px-5 pt-5 pb-6">
          {blockHead("Seu ciclo", "/app/dinheiro", "Dinheiro")}
          <div className="mt-4">
            <OrbitRing cycle={cycle}>
              <span className="text-[13px] text-ink-soft">{negative ? "Faltando no ciclo" : "Pode gastar por dia"}</span>
              <span
                className={`font-display mt-1 text-[2.15rem] leading-none font-bold ${negative ? "text-loss" : "metal-text"}`}
              >
                {formatCents(negative ? s.freeCents : s.perDayCents)}
              </span>
              <span className="mt-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs whitespace-nowrap text-ink-soft">
                {paydayText(cycle)}
              </span>
            </OrbitRing>
          </div>
          {!hasMoney ? (
            <p className="mt-2 text-center text-sm text-ink-soft">Lance o que entrou e o que saiu neste ciclo.</p>
          ) : negative ? (
            <p className="mt-2 text-center text-sm text-ink-soft">
              As contas e faturas do ciclo passam do que entrou. Veja o que dá para adiar.
            </p>
          ) : null}
        </section>

        {/* 4. A pagar */}
        <section className="glass rounded-[1.75rem] p-5">
          {blockHead("A pagar", "/app/dinheiro/contas", "Contas fixas")}
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

        {/* 5. Ainda vai entrar */}
        <section className="glass rounded-[1.75rem] p-5">
          {blockHead("Ainda vai entrar", "/app/dinheiro/contas", "Entradas fixas")}
          {pendingIncomes.length ? (
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
          ) : (
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              {f.incomes.length ? "Tudo já entrou neste ciclo." : "Cadastre salário e vale em Entradas fixas."}
            </p>
          )}
        </section>

        {/* 6. Hábitos de hoje */}
        <section className="glass rounded-[1.75rem] p-5">
          {blockHead("Hábitos de hoje", "/app/habitos", "Hábitos")}
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

        {/* 7. Para onde foi o dinheiro */}
        <section className="glass rounded-[2rem] p-5">
          {blockHead("Para onde foi o dinheiro", "/app/dinheiro", "Extrato")}
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

        {/* 8. Últimos lançamentos: só os 3 últimos */}
        <section className="glass rounded-[2rem] p-5">
          {blockHead("Últimos lançamentos", "/app/dinheiro", "Extrato")}
          {f.movements.length ? (
            <ul className="mt-1 divide-y divide-white/[0.06]">
              {f.movements.slice(0, 3).map((m) => (
                <MovementRow key={`${m.source}-${m.id}`} m={m} today={today} />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">Nada lançado neste ciclo ainda.</p>
          )}
        </section>
      </div>
    </div>
  );
}
