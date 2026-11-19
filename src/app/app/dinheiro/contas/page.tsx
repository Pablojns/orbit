import { Check, Receipt, Wallet } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import { DaySelect, Field, MoneyInput, Select, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import { archiveBill, archiveIncome, receiveIncome, saveBill, saveIncome, toggleBillPaid } from "@/app/app/actions";
import { diffInDays, formatShort } from "@/lib/dates";
import { getFinance } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { requireProfile } from "@/lib/profile";

export const metadata = { title: "Fixos" };
export const dynamic = "force-dynamic";

function when(days: number) {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days > 1) return `em ${days} dias`;
  return days === -1 ? "ontem" : `há ${-days} dias`;
}

export default async function FixedPage() {
  const profile = await requireProfile();
  const f = await getFinance(profile.cycleStartDay);
  const expenseCats = f.categories.filter((c) => c.kind === "expense");
  const contas = expenseCats.find((c) => c.name === "Contas");

  return (
    <div className="space-y-6">
      {/* Entradas fixas */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Entradas fixas</h2>
          <FormSheet
            title="Nova entrada fixa"
            trigger="Entrada fixa"
            submitLabel="Salvar entrada"
            action={saveIncome}
            variant="glass"
          >
            <Field label="Nome">
              <TextInput name="name" required maxLength={60} placeholder="Ex.: Salário" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor">
                <MoneyInput name="amount" required />
              </Field>
              <Field label="Cai no dia">
                <DaySelect name="day_of_month" defaultValue={5} />
              </Field>
            </div>
            <Field label="Termina em (opcional)" hint="Para algo que acaba, como uma pensão ou um contrato.">
              <TextInput name="ends_on" type="date" />
            </Field>
          </FormSheet>
        </div>
        {f.incomesInCycle.length || f.incomes.length ? (
          <ul className="glass mt-3 divide-y divide-white/[0.06] rounded-[1.75rem] px-5">
            {f.incomes.map((inc) => {
              const occ = f.incomesInCycle.filter((o) => o.incomeId === inc.id);
              return (
                <li key={inc.id} className="flex items-center gap-3 py-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gain/15 text-gain">
                    <Wallet size={19} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{inc.name}</p>
                    <p className="text-[13px] text-ink-soft">
                      Todo dia {inc.dayOfMonth}
                      {inc.endsOn
                        ? `, até ${formatShort({ year: +inc.endsOn.slice(0, 4), month: +inc.endsOn.slice(5, 7), day: +inc.endsOn.slice(8, 10) })}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-semibold text-gain">{formatCents(inc.amountCents)}</p>
                    {occ.length === 0 ? (
                      <p className="text-xs text-ink-soft">Fora deste ciclo</p>
                    ) : occ[0].received ? (
                      <p className="flex items-center justify-end gap-1 text-xs text-gain">
                        <Check size={13} aria-hidden /> Recebido
                      </p>
                    ) : (
                      <form action={receiveIncome}>
                        <input type="hidden" name="income_id" value={inc.id} />
                        <button
                          type="submit"
                          className="mt-1 rounded-full bg-gain/90 px-3 py-1 text-xs font-semibold text-[#05201a]"
                        >
                          Recebi
                        </button>
                      </form>
                    )}
                  </div>
                  <form action={archiveIncome}>
                    <input type="hidden" name="id" value={inc.id} />
                    <button
                      type="submit"
                      aria-label={`Remover ${inc.name}`}
                      className="text-xs text-ink-soft hover:text-loss"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-[15px] text-ink-soft">
            Cadastre seu salário e outras entradas que se repetem. Quando o dinheiro cair, toque em “Recebi”.
          </p>
        )}
      </section>

      {/* Contas fixas */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Contas fixas deste ciclo</h2>
          <FormSheet title="Nova conta fixa" trigger="Conta fixa" submitLabel="Salvar conta" action={saveBill}>
            <Field label="Nome">
              <TextInput name="name" required maxLength={60} placeholder="Ex.: Luz, Internet, Aluguel" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor">
                <MoneyInput name="amount" required />
              </Field>
              <Field label="Vence no dia">
                <DaySelect name="due_day" defaultValue={10} />
              </Field>
            </div>
            <Field label="Categoria">
              <Select
                name="category_id"
                defaultValue={contas?.id}
                options={expenseCats.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
            <Field label="Termina em (opcional)" hint="Para parcelas fora do cartão, como um financiamento.">
              <TextInput name="ends_on" type="date" />
            </Field>
          </FormSheet>
        </div>

        {f.billsInCycle.length ? (
          <ul className="glass mt-3 divide-y divide-white/[0.06] rounded-[1.75rem] px-5">
            {f.billsInCycle.map((b) => {
              const days = diffInDays(f.today, b.dueDate);
              const late = !b.paid && days < 0;
              return (
                <li key={`${b.billId}-${b.referenceMonth}`} className="flex items-center gap-3 py-4">
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                      b.paid ? "bg-gain/15 text-gain" : late ? "bg-loss/15 text-loss" : "bg-white/[0.06]"
                    }`}
                  >
                    <CategoryIcon name={b.category?.icon ?? "receipt"} size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{b.name}</p>
                    <p className={`text-[13px] ${late ? "text-loss" : "text-ink-soft"}`}>
                      {b.paid ? "Paga" : late ? `Venceu ${when(days)}` : `Vence ${when(days)}`}, dia {b.dueDate.day}
                    </p>
                  </div>
                  <p className="text-[15px] font-semibold">{formatCents(b.amountCents)}</p>
                  <form action={toggleBillPaid}>
                    <input type="hidden" name="bill_id" value={b.billId} />
                    <input type="hidden" name="reference_month" value={b.referenceMonth} />
                    <input type="hidden" name="amount" value={b.amountCents} />
                    <input type="hidden" name="paid" value={String(b.paid)} />
                    <button
                      type="submit"
                      aria-label={b.paid ? `Desmarcar ${b.name}` : `Marcar ${b.name} como paga`}
                      className={`grid h-9 w-9 place-items-center rounded-full border ${
                        b.paid
                          ? "border-gain bg-gain text-[#05201a]"
                          : "border-white/20 text-transparent hover:text-ink-soft"
                      }`}
                    >
                      <Check size={16} strokeWidth={3} aria-hidden />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : f.bills.length ? (
          <p className="mt-2 text-[15px] text-ink-soft">Nenhuma conta vence neste ciclo.</p>
        ) : (
          <div className="mt-3">
            <EmptyState
              icon={Receipt}
              title="Nenhuma conta fixa"
              description="Luz, água, internet, aluguel, academia: cadastre uma vez e marque como paga todo mês. O que falta pagar já sai do seu livre."
            />
          </div>
        )}

        {f.bills.length ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-ink-soft">Gerenciar contas ({f.bills.length})</summary>
            <ul className="mt-2 space-y-2">
              {f.bills.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-2.5 text-sm"
                >
                  <span>
                    {b.name}, dia {b.dueDay}, {formatCents(b.amountCents)}
                  </span>
                  <form action={archiveBill}>
                    <input type="hidden" name="id" value={b.id} />
                    <button type="submit" className="text-xs text-ink-soft hover:text-loss">
                      Remover
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    </div>
  );
}
