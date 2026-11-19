import Link from "next/link";
import { DeleteButton } from "@/components/undo";
import { ArrowDownLeft, ArrowUpRight, Check, Wallet } from "lucide-react";
import { BillExtraFields } from "@/components/bill-extra-fields";
import { CategoryIcon } from "@/components/category-icon";
import { CopyButton } from "@/components/copy-button";
import { EditBill, EditIncome } from "@/components/edit-forms";
import { DaySelect, Field, MoneyInput, Select, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import { archiveBill, archiveIncome, receiveIncome, saveBill, saveIncome, toggleBillPaid } from "@/app/app/actions";
import { diffInDays, formatShort, fromISODate } from "@/lib/dates";
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

export default async function FixedPage({ searchParams }: { searchParams: Promise<{ lado?: string }> }) {
  const { lado } = await searchParams;
  const side = lado === "contas" ? "contas" : "entradas";
  const profile = await requireProfile();
  const f = await getFinance(profile.cycleStartDay);
  const expenseCats = f.categories.filter((c) => c.kind === "expense");
  const contas = expenseCats.find((c) => c.name === "Contas");

  const incomesTotal = f.incomesInCycle.reduce((a, i) => a + i.amountCents, 0);
  const billsTotal = f.billsInCycle.reduce((a, b) => a + b.amountCents, 0);
  const subsTotal = f.bills.filter((b) => b.isSubscription).reduce((a, b) => a + b.myShareCents, 0);

  const incomeColumn = (
    <section className={`${side === "entradas" ? "block" : "hidden"} lg:block`}>
      <div className="rounded-[1.75rem] border border-gain/25 bg-gain/[0.04]">
        <header className="flex items-center justify-between gap-3 border-b border-gain/15 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ArrowDownLeft size={18} className="text-gain" aria-hidden /> Entradas fixas
            </h2>
            <p className="text-sm text-ink-soft">Neste ciclo: {formatCents(incomesTotal)}</p>
          </div>
          <FormSheet
            title="Nova entrada fixa"
            trigger="Nova"
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
        </header>

        {f.incomes.length ? (
          <ul className="space-y-2 p-3">
            {f.incomes.map((inc) => {
              const occ = f.incomesInCycle.find((o) => o.incomeId === inc.id);
              return (
                <li key={inc.id} className="glass rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gain/15 text-gain">
                      <Wallet size={18} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">{inc.name}</p>
                      <p className="text-[13px] text-ink-soft">
                        Todo dia {inc.dayOfMonth}
                        {inc.endsOn ? `, até ${formatShort(fromISODate(inc.endsOn))}` : ""}
                      </p>
                    </div>
                    <EditIncome income={inc} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="font-display text-lg font-bold text-gain">{formatCents(inc.amountCents)}</p>
                    {!occ ? (
                      <span className="text-xs text-ink-soft">Fora deste ciclo</span>
                    ) : occ.received ? (
                      <span className="flex items-center gap-1 rounded-full bg-gain/15 px-3 py-1 text-xs font-semibold text-gain">
                        <Check size={13} aria-hidden /> Recebido
                      </span>
                    ) : (
                      <form action={receiveIncome}>
                        <input type="hidden" name="income_id" value={inc.id} />
                        <button
                          type="submit"
                          className="rounded-full bg-gain/90 px-4 py-1.5 text-xs font-semibold text-[#05201a]"
                        >
                          Recebi
                        </button>
                      </form>
                    )}
                  </div>
                  <div className="mt-2 text-right">
                    <DeleteButton
                      action={archiveIncome}
                      fields={{ id: inc.id }}
                      label={`Remover ${inc.name}`}
                      variant="text"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-5 text-[15px] leading-relaxed text-ink-soft">
            Cadastre seu salário e outras entradas que se repetem. Quando o dinheiro cair, toque em “Recebi”.
          </p>
        )}
      </div>
    </section>
  );

  const billColumn = (
    <section className={`${side === "contas" ? "block" : "hidden"} lg:block`}>
      <div className="rounded-[1.75rem] border border-sun/25 bg-sun/[0.04]">
        <header className="flex items-center justify-between gap-3 border-b border-sun/15 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ArrowUpRight size={18} className="text-sun" aria-hidden /> Contas fixas
            </h2>
            <p className="text-sm text-ink-soft">Neste ciclo: {formatCents(billsTotal)}</p>
          </div>
          <FormSheet title="Nova conta fixa" trigger="Nova" submitLabel="Salvar conta" action={saveBill}>
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
            <BillExtraFields />
          </FormSheet>
        </header>

        {f.bills.length ? (
          <ul className="space-y-2 p-3">
            {[...f.bills.filter((b) => !b.isSubscription), ...f.bills.filter((b) => b.isSubscription)].map(
              (bill, i, arr) => {
                const firstSub = bill.isSubscription && (i === 0 || !arr[i - 1].isSubscription);
                const occ = f.billsInCycle.find((b) => b.billId === bill.id);
                const days = occ ? diffInDays(f.today, occ.dueDate) : null;
                const late = occ && !occ.paid && days !== null && days < 0;
                return (
                  <li key={bill.id} className="space-y-2">
                    {firstSub ? (
                      <p className="px-1 pt-2 text-sm font-semibold text-ink-soft">
                        Assinaturas · {formatCents(subsTotal)} por mês
                      </p>
                    ) : null}
                    <div className={`glass rounded-2xl p-4 ${late ? "ring-1 ring-loss/50" : ""}`}>
                      <div className="flex items-start gap-3">
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                            occ?.paid ? "bg-gain/15 text-gain" : late ? "bg-loss/15 text-loss" : "bg-sun/15 text-sun"
                          }`}
                        >
                          <CategoryIcon name={bill.category?.icon ?? "receipt"} size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 text-[15px] font-semibold">
                            <span className="truncate">{bill.name}</span>
                            {bill.isSubscription ? (
                              <span className="shrink-0 rounded-full bg-cobalt/15 px-2 py-0.5 text-[10px] font-semibold text-cobalt">
                                assinatura
                              </span>
                            ) : null}
                            {bill.split !== "none" ? (
                              <span className="shrink-0 rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                                dividida
                              </span>
                            ) : null}
                          </p>
                          <p className={`text-[13px] ${late ? "text-loss" : "text-ink-soft"}`}>
                            {!occ
                              ? `Vence todo dia ${bill.dueDay}`
                              : occ.paid
                                ? `Paga, dia ${occ.dueDate.day}`
                                : late
                                  ? `Venceu ${when(days!)}, dia ${occ.dueDate.day}`
                                  : `Vence ${when(days!)}, dia ${occ.dueDate.day}`}
                          </p>
                        </div>
                        <EditBill bill={bill} categories={f.categories} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-display text-lg font-bold">{formatCents(bill.myShareCents)}</p>
                          {bill.split !== "none" ? (
                            <p className="text-xs text-ink-soft">sua parte de {formatCents(bill.amountCents)}</p>
                          ) : null}
                        </div>
                        {occ ? (
                          <form action={toggleBillPaid}>
                            <input type="hidden" name="bill_id" value={occ.billId} />
                            <input type="hidden" name="reference_month" value={occ.referenceMonth} />
                            <input type="hidden" name="amount" value={occ.amountCents} />
                            <input type="hidden" name="paid" value={String(occ.paid)} />
                            <button
                              type="submit"
                              className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold ${
                                occ.paid ? "bg-gain/15 text-gain" : "bg-sun text-[#2a1a00]"
                              }`}
                            >
                              {occ.paid ? (
                                <>
                                  <Check size={13} aria-hidden /> Paga
                                </>
                              ) : (
                                "Paguei"
                              )}
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-ink-soft">Fora deste ciclo</span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {bill.paymentCode ? <CopyButton text={bill.paymentCode} /> : <span />}
                        <DeleteButton
                          action={archiveBill}
                          fields={{ id: bill.id }}
                          label={`Remover ${bill.name}`}
                          variant="text"
                        />
                      </div>
                    </div>
                  </li>
                );
              },
            )}
          </ul>
        ) : (
          <p className="px-5 py-5 text-[15px] leading-relaxed text-ink-soft">
            Luz, água, internet, aluguel: cadastre uma vez e marque como paga todo mês. O que falta pagar já sai do seu
            livre.
          </p>
        )}
      </div>
    </section>
  );

  return (
    <div>
      {/* Celular: escolhe o lado. Computador: os dois lado a lado. */}
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.04] p-1 lg:hidden">
        <Link
          href="/app/dinheiro/contas?lado=entradas"
          className={`rounded-xl px-3 py-2.5 text-center text-sm font-semibold ${
            side === "entradas" ? "bg-gain/90 text-[#05201a]" : "text-ink-soft"
          }`}
        >
          Entradas · {formatCents(incomesTotal)}
        </Link>
        <Link
          href="/app/dinheiro/contas?lado=contas"
          className={`rounded-xl px-3 py-2.5 text-center text-sm font-semibold ${
            side === "contas" ? "bg-sun text-[#2a1a00]" : "text-ink-soft"
          }`}
        >
          Contas · {formatCents(billsTotal)}
        </Link>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {incomeColumn}
        {billColumn}
      </div>
    </div>
  );
}
