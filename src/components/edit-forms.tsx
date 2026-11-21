import { BillExtraFields } from "./bill-extra-fields";
import { DeleteButton } from "./undo";
import {
  deleteEvent,
  updateBill,
  updateCard,
  updateEvent,
  updateGoal,
  updateHabit,
  updateIncome,
  updateMovement,
  updateTask,
} from "@/app/app/actions";
import type { Bill, Card, Category, Goal, Movement, RecurringIncome } from "@/lib/finance";
import { centsToInput } from "@/lib/money";
import type { AgendaEvent, EventType, Habit, Task } from "@/lib/routine";
import { DaySelect, Field, MoneyInput, Select, TextInput } from "./fields";
import { FormSheet } from "./form-sheet";

const METHODS = [
  { value: "pix", label: "Pix" },
  { value: "debit", label: "Débito" },
  { value: "cash", label: "Dinheiro" },
  { value: "transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
];

const catOptions = (cats: Category[], kind: "expense" | "income") => [
  { value: "", label: "Sem categoria" },
  ...cats.filter((c) => c.kind === kind).map((c) => ({ value: c.id, label: c.name })),
];

export function EditMovement({ m, categories, cards }: { m: Movement; categories: Category[]; cards: Card[] }) {
  const isCard = m.source === "card_purchase";
  return (
    <FormSheet
      title={isCard ? "Editar compra no cartão" : m.type === "income" ? "Editar entrada" : "Editar gasto"}
      trigger="Editar"
      submitLabel="Salvar alterações"
      action={updateMovement}
      hidden={{ id: m.id, source: m.source }}
      variant="edit"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor">
          <MoneyInput name="amount" required defaultValue={centsToInput(m.amountCents)} />
        </Field>
        <Field label="Data">
          <TextInput name="occurred_on" type="date" required defaultValue={m.occurredOn} />
        </Field>
      </div>
      <Field label="Categoria">
        <Select name="category_id" defaultValue={m.categoryId ?? ""} options={catOptions(categories, m.type)} />
      </Field>
      {isCard ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cartão">
            <Select
              name="card_id"
              defaultValue={m.cardId}
              options={cards.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Field>
          <Field label="Parcelas">
            <Select
              name="installments"
              defaultValue={String(m.installments ?? 1)}
              options={Array.from({ length: 24 }, (_, i) => ({
                value: String(i + 1),
                label: i === 0 ? "À vista" : `${i + 1}x`,
              }))}
            />
          </Field>
        </div>
      ) : m.type === "expense" ? (
        <Field label="Pagou com">
          <Select name="payment_method" defaultValue={m.paymentMethod ?? "pix"} options={METHODS} />
        </Field>
      ) : null}
      <Field label="Descrição">
        <TextInput name="description" maxLength={120} defaultValue={m.description ?? ""} />
      </Field>
    </FormSheet>
  );
}

export function EditCard({ card }: { card: Card }) {
  return (
    <FormSheet
      title="Editar cartão"
      trigger="Editar cartão"
      submitLabel="Salvar alterações"
      action={updateCard}
      hidden={{ id: card.id }}
      variant="edit"
    >
      <Field label="Nome do cartão">
        <TextInput name="name" required maxLength={40} defaultValue={card.name} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha no dia">
          <DaySelect name="closing_day" defaultValue={card.closingDay} />
        </Field>
        <Field label="Vence no dia">
          <DaySelect name="due_day" defaultValue={card.dueDay} />
        </Field>
      </div>
      <Field label="Limite (opcional)">
        <MoneyInput name="limit" defaultValue={card.limitCents ? centsToInput(card.limitCents) : ""} />
      </Field>
      <p className="text-xs text-ink-soft">Se mudar o fechamento ou o vencimento, as parcelas são recalculadas.</p>
    </FormSheet>
  );
}

export function EditBill({ bill, categories }: { bill: Bill; categories: Category[] }) {
  return (
    <FormSheet
      title="Editar conta fixa"
      trigger={`Editar ${bill.name}`}
      submitLabel="Salvar alterações"
      action={updateBill}
      hidden={{ id: bill.id }}
      variant="edit"
    >
      <Field label="Nome">
        <TextInput name="name" required maxLength={60} defaultValue={bill.name} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor">
          <MoneyInput name="amount" required defaultValue={centsToInput(bill.amountCents)} />
        </Field>
        <Field label="Vence no dia">
          <DaySelect name="due_day" defaultValue={bill.dueDay} />
        </Field>
      </div>
      <Field label="Categoria">
        <Select name="category_id" defaultValue={bill.categoryId ?? ""} options={catOptions(categories, "expense")} />
      </Field>
      <Field label="Termina em (opcional)">
        <TextInput name="ends_on" type="date" defaultValue={bill.endsOn ?? ""} />
      </Field>
      <BillExtraFields
        isSubscription={bill.isSubscription}
        paymentCode={bill.paymentCode ?? ""}
      />
    </FormSheet>
  );
}

export function EditIncome({ income }: { income: RecurringIncome }) {
  return (
    <FormSheet
      title="Editar entrada fixa"
      trigger={`Editar ${income.name}`}
      submitLabel="Salvar alterações"
      action={updateIncome}
      hidden={{ id: income.id }}
      variant="edit"
    >
      <Field label="Nome">
        <TextInput name="name" required maxLength={60} defaultValue={income.name} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor">
          <MoneyInput name="amount" required defaultValue={centsToInput(income.amountCents)} />
        </Field>
        <Field label="Cai no dia">
          <DaySelect name="day_of_month" defaultValue={income.dayOfMonth} />
        </Field>
      </div>
      <Field label="Termina em (opcional)">
        <TextInput name="ends_on" type="date" defaultValue={income.endsOn ?? ""} />
      </Field>
    </FormSheet>
  );
}

export function EditGoal({ goal }: { goal: Goal }) {
  return (
    <FormSheet
      title="Editar meta"
      trigger={`Editar ${goal.name}`}
      submitLabel="Salvar alterações"
      action={updateGoal}
      hidden={{ id: goal.id }}
      variant="edit"
    >
      <Field label="Nome">
        <TextInput name="name" required maxLength={60} defaultValue={goal.name} />
      </Field>
      <Field label="Quanto quer juntar">
        <MoneyInput name="target" required defaultValue={centsToInput(goal.targetCents)} />
      </Field>
      <Field label="Até quando (opcional)">
        <TextInput name="target_date" type="date" defaultValue={goal.targetDate ?? ""} />
      </Field>
    </FormSheet>
  );
}

export function EditHabit({ habit }: { habit: Habit }) {
  return (
    <FormSheet
      title="Editar hábito"
      trigger={`Editar ${habit.name}`}
      submitLabel="Salvar alterações"
      action={updateHabit}
      hidden={{ id: habit.id }}
      variant="edit"
    >
      <Field label="Hábito">
        <TextInput name="name" required maxLength={60} defaultValue={habit.name} />
      </Field>
      <Field label="Quantas vezes por semana">
        <Select
          name="target_per_week"
          defaultValue={String(habit.targetPerWeek)}
          options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({
            value: String(n),
            label: n === 7 ? "Todo dia" : `${n}x por semana`,
          }))}
        />
      </Field>
    </FormSheet>
  );
}

export const PRIORITY_OPTIONS = [
  { value: "", label: "Sem prioridade" },
  { value: "1", label: "Alta" },
  { value: "2", label: "Média" },
  { value: "3", label: "Baixa" },
];

export const REMIND_OPTIONS = [
  { value: "0", label: "Só no dia e na véspera" },
  { value: "2", label: "2 dias antes" },
  { value: "3", label: "3 dias antes" },
  { value: "7", label: "1 semana antes" },
  { value: "14", label: "2 semanas antes" },
];

export function EditEvent({ e, types }: { e: AgendaEvent; types: EventType[] }) {
  const typeOptions = types
    .filter((t) => !t.archived || t.id === e.typeId)
    .map((t) => ({ value: t.id, label: t.name }));
  return (
    <FormSheet
      title="Editar item da agenda"
      trigger={`Editar ${e.title}`}
      submitLabel="Salvar alterações"
      action={updateEvent}
      hidden={{ id: e.id }}
      variant="edit"
    >
      <Field label="O que é">
        <TextInput name="title" required maxLength={80} defaultValue={e.title} />
      </Field>
      <input type="hidden" name="kind" value={e.kind} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <Select name="type_id" defaultValue={e.typeId ?? ""} options={typeOptions} />
        </Field>
        <Field label="Prioridade">
          <Select name="priority" defaultValue={e.priority ? String(e.priority) : ""} options={PRIORITY_OPTIONS} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data">
          <TextInput name="date" type="date" required defaultValue={e.date} />
        </Field>
        <Field label="Hora (opcional)">
          <TextInput name="time" type="time" defaultValue={e.time ?? ""} />
        </Field>
      </div>
      <Field label="Me avisar">
        <Select
          name="remind_days"
          defaultValue={String(e.remindDays)}
          options={
            REMIND_OPTIONS.some((o) => o.value === String(e.remindDays))
              ? REMIND_OPTIONS
              : [...REMIND_OPTIONS, { value: String(e.remindDays), label: `${e.remindDays} dias antes` }]
          }
        />
      </Field>
      <Field label="Anotação (opcional)">
        <TextInput name="notes" maxLength={500} defaultValue={e.notes ?? ""} />
      </Field>
      {e.seriesId ? (
        <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
          <span className="text-ink-soft">Este item se repete. Mudanças aqui valem só para esta data.</span>
          <DeleteButton
            action={deleteEvent}
            fields={{ id: e.id, series: "all" }}
            label="Apagar todas as datas desta série"
            variant="text"
            text="Apagar todas as datas"
          />
        </div>
      ) : null}
    </FormSheet>
  );
}

export function EditTask({ t }: { t: Task }) {
  return (
    <FormSheet
      title="Editar tarefa"
      trigger={`Editar ${t.title}`}
      submitLabel="Salvar alterações"
      action={updateTask}
      hidden={{ id: t.id }}
      variant="edit"
    >
      <Field label="Tarefa">
        <TextInput name="title" required maxLength={120} defaultValue={t.title} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prioridade">
          <Select
            name="priority"
            defaultValue={String(t.priority)}
            options={[
              { value: "1", label: "Alta" },
              { value: "2", label: "Média" },
              { value: "3", label: "Baixa" },
            ]}
          />
        </Field>
        <Field label="Para quando">
          <TextInput name="due_on" type="date" defaultValue={t.dueOn ?? ""} />
        </Field>
      </div>
    </FormSheet>
  );
}
