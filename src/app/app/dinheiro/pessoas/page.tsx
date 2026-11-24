import { ArrowDownLeft, ArrowUpRight, Check, Users } from "lucide-react";
import { deleteDebt, saveDebt, settleDebt, updateDebt } from "@/app/app/actions";
import { EmptyState } from "@/components/empty-state";
import { Field, MoneyInput, Select, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import { DeleteButton } from "@/components/undo";
import { todayInSaoPaulo, toISODate } from "@/lib/dates";
import { type Debt, getDebts } from "@/lib/debts";
import { centsToInput, formatCents } from "@/lib/money";

export const metadata = { title: "Empréstimos" };
export const dynamic = "force-dynamic";

const DIRECTIONS = [
  { value: "owed_to_me", label: "Me deve (eu emprestei ou paguei por ela)" },
  { value: "i_owe", label: "Eu devo (ela pagou por mim)" },
];

function shortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replace(".", "");
}

function DebtRow({ d }: { d: Debt }) {
  const mine = d.direction === "owed_to_me";
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          d.settled ? "bg-white/[0.05] text-ink-soft" : mine ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss"
        }`}
      >
        {mine ? <ArrowDownLeft size={18} aria-hidden /> : <ArrowUpRight size={18} aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-semibold ${d.settled ? "text-ink-soft line-through" : ""}`}>
          {d.person}
        </p>
        <p className="truncate text-[13px] text-ink-soft">
          {mine ? "Te deve" : "Você deve"}, {shortDate(d.occurredOn)}
          {d.note ? ` · ${d.note}` : ""}
        </p>
      </div>
      <span
        className={`shrink-0 font-display font-semibold ${d.settled ? "text-ink-soft" : mine ? "text-gain" : "text-loss"}`}
      >
        {formatCents(d.amountCents)}
      </span>
      <form action={settleDebt}>
        <input type="hidden" name="id" value={d.id} />
        <input type="hidden" name="settled" value={String(d.settled)} />
        <button
          type="submit"
          aria-label={
            d.settled ? `Reabrir ${d.person}` : mine ? `Marcar que ${d.person} pagou` : `Marcar que paguei ${d.person}`
          }
          title={d.settled ? "Reabrir" : mine ? "Recebi" : "Paguei"}
          className={`grid h-9 w-9 place-items-center rounded-full border ${
            d.settled ? "border-gain bg-gain text-[#0b1440]" : "border-white/20 text-transparent hover:text-ink-soft"
          }`}
        >
          <Check size={16} strokeWidth={3} aria-hidden />
        </button>
      </form>
      <FormSheet
        title="Editar"
        trigger={`Editar ${d.person}`}
        submitLabel="Salvar alterações"
        action={updateDebt}
        hidden={{ id: d.id }}
        variant="edit"
      >
        <Field label="Quem">
          <TextInput name="person" required maxLength={60} defaultValue={d.person} />
        </Field>
        <Field label="Situação">
          <Select name="direction" defaultValue={d.direction} options={DIRECTIONS} />
        </Field>
        <Field label="Valor">
          <MoneyInput name="amount" required defaultValue={centsToInput(d.amountCents)} />
        </Field>
        <Field label="Do quê (opcional)">
          <TextInput name="note" maxLength={120} defaultValue={d.note ?? ""} />
        </Field>
      </FormSheet>
      <DeleteButton action={deleteDebt} fields={{ id: d.id }} label={`Apagar ${d.person}`} />
    </li>
  );
}

export default async function PeoplePage() {
  const debts = await getDebts();
  const open = debts.filter((d) => !d.settled);
  const settled = debts.filter((d) => d.settled);
  const owedToMe = open.filter((d) => d.direction === "owed_to_me").reduce((a, d) => a + d.amountCents, 0);
  const iOwe = open.filter((d) => d.direction === "i_owe").reduce((a, d) => a + d.amountCents, 0);

  // Saldo por pessoa (só o que está em aberto).
  const byPerson = new Map<string, number>();
  for (const d of open) {
    const k = d.person.trim();
    byPerson.set(k, (byPerson.get(k) ?? 0) + (d.direction === "owed_to_me" ? d.amountCents : -d.amountCents));
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-3">
        <div className="glass rounded-3xl p-4">
          <p className="text-sm text-ink-soft">Te devem</p>
          <p className="font-display text-2xl font-bold text-gain">{formatCents(owedToMe)}</p>
        </div>
        <div className="glass rounded-3xl p-4">
          <p className="text-sm text-ink-soft">Você deve</p>
          <p className="font-display text-2xl font-bold text-loss">{formatCents(iOwe)}</p>
        </div>
      </section>

      <div className="mt-4">
        <FormSheet title="Anotar" trigger="Anotar quem deve" submitLabel="Salvar" action={saveDebt}>
          <Field label="Quem">
            <TextInput name="person" required maxLength={60} placeholder="Ex.: João" />
          </Field>
          <Field label="Situação">
            <Select name="direction" defaultValue="owed_to_me" options={DIRECTIONS} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">
              <MoneyInput name="amount" required />
            </Field>
            <Field label="Quando">
              <TextInput name="occurred_on" type="date" defaultValue={toISODate(todayInSaoPaulo())} />
            </Field>
          </div>
          <Field label="Do quê (opcional)">
            <TextInput name="note" maxLength={120} placeholder="Ex.: pizza de sexta" />
          </Field>
        </FormSheet>
      </div>

      {byPerson.size > 1 ? (
        <section className="glass mt-5 rounded-3xl p-5">
          <h2 className="text-lg font-semibold">Saldo por pessoa</h2>
          <ul className="mt-2 divide-y divide-white/[0.06]">
            {[...byPerson.entries()].map(([person, bal]) => (
              <li key={person} className="flex items-center justify-between py-2.5 text-[15px]">
                <span>{person}</span>
                <span className={bal >= 0 ? "text-gain" : "text-loss"}>
                  {bal >= 0 ? "te deve " : "você deve "}
                  {formatCents(Math.abs(bal))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {open.length ? (
        <section className="glass mt-5 rounded-3xl px-5 py-2">
          <ul className="divide-y divide-white/[0.06]">
            {open.map((d) => (
              <DebtRow key={d.id} d={d} />
            ))}
          </ul>
        </section>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon={Users}
            title="Ninguém te deve, você não deve ninguém"
            description="Emprestou, rachou uma conta ou alguém pagou por você? Anote aqui e marque quando acertar."
          />
        </div>
      )}

      {settled.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-ink-soft">Já acertados ({settled.length})</summary>
          <section className="glass mt-2 rounded-3xl px-5 py-2">
            <ul className="divide-y divide-white/[0.06]">
              {settled.map((d) => (
                <DebtRow key={d.id} d={d} />
              ))}
            </ul>
          </section>
        </details>
      ) : null}
    </>
  );
}
