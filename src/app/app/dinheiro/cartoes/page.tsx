import { CreditCard } from "lucide-react";
import { DeleteButton } from "@/components/undo";
import { EditCard } from "@/components/edit-forms";
import { EmptyState } from "@/components/empty-state";
import { DaySelect, Field, MoneyInput, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import { SheetButton } from "@/components/sheet-button";
import { archiveCard, payStatement, saveCard, unpayStatement } from "@/app/app/actions";
import { diffInDays, formatShort } from "@/lib/dates";
import { getFinance, type Statement } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { requireProfile } from "@/lib/profile";

export const metadata = { title: "Cartões" };
export const dynamic = "force-dynamic";

const STATUS: Record<Statement["status"], { label: string; tone: string }> = {
  open: { label: "Aberta", tone: "bg-cobalt-soft text-cobalt" },
  closed: { label: "Fechada", tone: "bg-sun/20 text-sun" },
  paid: { label: "Paga", tone: "bg-gain/15 text-gain" },
  future: { label: "Próxima", tone: "bg-white/[0.06] text-ink-soft" },
};

export default async function CardsPage() {
  const profile = await requireProfile();
  const f = await getFinance(profile.cycleStartDay);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] text-ink-soft">
          {f.cards.length ? "Faturas que vencem neste ciclo e a fatura aberta de cada cartão." : "Nenhum cartão ainda."}
        </p>
        <FormSheet title="Novo cartão" trigger="Cartão" submitLabel="Salvar cartão" action={saveCard}>
          <Field label="Nome do cartão">
            <TextInput name="name" required maxLength={40} placeholder="Ex.: Nubank" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha no dia">
              <DaySelect name="closing_day" defaultValue={3} />
            </Field>
            <Field label="Vence no dia">
              <DaySelect name="due_day" defaultValue={10} />
            </Field>
          </div>
          <Field label="Limite (opcional)">
            <MoneyInput name="limit" />
          </Field>
        </FormSheet>
      </div>

      {!f.cards.length ? (
        <EmptyState
          icon={CreditCard}
          title="Cadastre seu cartão de crédito"
          description="Com o fechamento e o vencimento, cada compra parcelada cai sozinha na fatura certa, e o valor da fatura já sai do seu livre para gastar."
        />
      ) : null}

      {f.cards.map((card) => {
        const cardStatements = f.statements.filter((st) => st.cardId === card.id);
        const statements = cardStatements.filter((st) => st.status !== "future");
        const future = cardStatements.filter((st) => st.status === "future");
        const open = statements.find((st) => st.status === "open");
        const usedCents = cardStatements
          .filter((st) => st.status !== "paid")
          .reduce((a, st) => a + st.remainingCents, 0);
        return (
          <section key={card.id} className="glass overflow-hidden rounded-3xl">
            <div className="hero-card relative overflow-hidden p-5">
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="font-display text-xl font-bold">{card.name}</p>
                  <p className="text-sm text-white/70">
                    Fecha dia {card.closingDay}, vence dia {card.dueDay}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <EditCard card={card} />
                  <DeleteButton
                    action={archiveCard}
                    fields={{ id: card.id }}
                    label={`Remover cartão ${card.name}`}
                  />
                </div>
              </div>
              {/* A fatura aberta aparece uma vez só: na lista de faturas logo abaixo. */}
              {card.limitCents ? (
                <div className="relative mt-5">
                  <p className="text-xs text-white/70">Limite livre aproximado</p>
                  <p className="text-3xl font-extrabold">
                    {formatCents(Math.max(0, card.limitCents - usedCents))}
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-[#a78bfa]"
                      style={{ width: `${Math.min(100, (usedCents / card.limitCents) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-white/70">
                    de {formatCents(card.limitCents)}, contando todas as parcelas que ainda vão vir
                  </p>
                </div>
              ) : (
                <p className="relative mt-5 text-xs text-white/70">
                  Fatura aberta: {formatCents(open?.totalCents ?? 0)}. Cadastre o limite para ver quanto ainda tem.
                </p>
              )}
            </div>

            <ul className="divide-y divide-white/[0.06] px-5">
              {statements.length ? (
                statements.map((st) => {
                  const days = diffInDays(f.today, st.dueDate);
                  return (
                    <li key={st.month} className="py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[15px] font-semibold">
                            Fatura de{" "}
                            {new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(
                              new Date(`${st.month}T12:00:00Z`),
                            )}
                          </p>
                          <p className="text-[13px] text-ink-soft">
                            Vence {formatShort(st.dueDate)}
                            {st.status !== "paid" && days >= 0 ? `, em ${days} ${days === 1 ? "dia" : "dias"}` : ""}
                            {st.status !== "paid" && days < 0 ? ", vencida" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[15px] font-semibold">{formatCents(st.totalCents)}</p>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[st.status].tone}`}
                          >
                            {STATUS[st.status].label}
                          </span>
                        </div>
                      </div>
                      <SheetButton
                        title={`Fatura de ${new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(`${st.month}T12:00:00Z`))} · ${card.name}`}
                        className="mt-2 flex min-h-9 items-center text-[13px] font-bold text-[#a78bfa]"
                        trigger={`Ver ${st.items.length} ${st.items.length === 1 ? "lançamento" : "lançamentos"}`}
                      >
                        <ul>
                          {st.items.map((it, i) => (
                            <li key={i} className="flex justify-between gap-3 border-t border-white/[0.07] py-2.5 text-[15px] first:border-t-0">
                              <span className="truncate">
                                {it.description}
                                {it.count > 1 ? ` (${it.number}/${it.count})` : ""}
                              </span>
                              <span className="shrink-0 font-bold">{formatCents(it.amountCents)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 flex justify-between border-t border-white/10 pt-3 text-[15px] font-extrabold">
                          <span>Total</span>
                          <span>{formatCents(st.totalCents)}</span>
                        </p>
                      </SheetButton>
                      {st.status === "closed" || (st.status === "open" && days <= 10) ? (
                        <form action={payStatement} className="mt-3">
                          <input type="hidden" name="card_id" value={st.cardId} />
                          <input type="hidden" name="month" value={st.month} />
                          <input type="hidden" name="amount" value={st.remainingCents} />
                          <button
                            type="submit"
                            className="grad-primary h-11 w-full rounded-2xl px-4 text-sm font-bold text-white"
                          >
                            Paguei {formatCents(st.remainingCents)}
                          </button>
                        </form>
                      ) : null}
                      {st.status === "paid" ? (
                        <form action={unpayStatement} className="mt-2">
                          <input type="hidden" name="card_id" value={st.cardId} />
                          <input type="hidden" name="month" value={st.month} />
                          <button type="submit" className="text-xs text-ink-soft hover:text-ink">
                            Desfazer pagamento
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })
              ) : (
                <li className="py-4 text-[15px] text-ink-soft">
                  Nenhuma compra neste cartão.
                </li>
              )}
            </ul>
            {future.length ? (
              <details className="border-t border-white/[0.06] px-5 py-3">
                <summary className="cursor-pointer text-[13px] text-ink-soft">
                  Próximas faturas ({future.length}): {formatCents(future.reduce((a, st) => a + st.totalCents, 0))} já
                  comprometidos
                </summary>
                <ul className="mt-2 space-y-1.5 text-[13px]">
                  {future.map((st) => (
                    <li key={st.month} className="flex justify-between text-ink-soft">
                      <span>Vence {formatShort(st.dueDate)}</span>
                      <span className="text-ink">{formatCents(st.totalCents)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
