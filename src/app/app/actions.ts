"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { parseToCents } from "@/lib/money";
import { fromISODate, todayInSaoPaulo, toISODate } from "@/lib/dates";
import { installmentPlan } from "@/lib/schedule";

export type FormState = { status: "idle" | "saved" | "error"; message?: string };
export type MovementFormState = FormState;

const PAYMENT_METHODS = new Set(["cash", "debit", "pix", "transfer", "other"]);
const UUID = /^[0-9a-f-]{36}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}-01$/;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optUuid = (v: string) => (UUID.test(v) ? v : null);
const day = (v: string) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
};
const fail = (message: string): FormState => ({ status: "error", message });
const ok = (message: string): FormState => {
  revalidatePath("/app", "layout");
  return { status: "saved", message };
};
const todayISO = () => toISODate(todayInSaoPaulo());

async function db() {
  return createClient();
}

// ---------- movimentações e compras no cartão -----------------------

export async function addMovement(_prev: FormState, fd: FormData): Promise<FormState> {
  const type = str(fd, "type");
  const amount = parseToCents(str(fd, "amount"));
  const categoryId = optUuid(str(fd, "category_id"));
  const occurredOn = str(fd, "occurred_on");
  const method = str(fd, "payment_method");
  const description = str(fd, "description").slice(0, 120);

  if (type !== "expense" && type !== "income") return fail("Escolha gasto ou entrada.");
  if (!amount || amount <= 0 || amount > 10_000_000_000) return fail("Digite um valor, como 25,90.");
  if (!ISO_DATE.test(occurredOn)) return fail("Escolha a data.");

  const supabase = await db();

  if (type === "expense" && method === "credit") {
    const cardId = optUuid(str(fd, "card_id"));
    const count = Math.min(48, Math.max(1, Number(str(fd, "installments")) || 1));
    if (!cardId) return fail("Escolha o cartão.");
    const { data: card } = await supabase
      .from("credit_cards")
      .select("closing_day, due_day")
      .eq("id", cardId)
      .eq("user_id", OWNER_ID)
      .maybeSingle();
    if (!card) return fail("Cartão não encontrado.");

    const { data: purchase, error } = await supabase
      .from("card_purchases")
      .insert({
        user_id: OWNER_ID,
        card_id: cardId,
        description: description || "Compra no cartão",
        total_cents: amount,
        installments_count: count,
        purchased_on: occurredOn,
        category_id: categoryId,
      })
      .select("id")
      .single();
    if (error || !purchase) return fail("Não foi possível salvar a compra.");

    const plan = installmentPlan(fromISODate(occurredOn), amount, count, card.closing_day, card.due_day);
    const { error: instError } = await supabase.from("installments").insert(
      plan.map((p) => ({
        user_id: OWNER_ID,
        purchase_id: purchase.id,
        card_id: cardId,
        number: p.number,
        amount_cents: p.amountCents,
        statement_month: p.statementMonth,
      })),
    );
    if (instError) {
      await supabase.from("card_purchases").delete().eq("id", purchase.id);
      return fail("Não foi possível salvar as parcelas.");
    }
    return ok(count > 1 ? `Compra em ${count}x salva.` : "Compra no cartão salva.");
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: OWNER_ID,
    type,
    amount_cents: amount,
    occurred_on: occurredOn,
    category_id: categoryId,
    payment_method: type === "expense" && PAYMENT_METHODS.has(method) ? method : null,
    description: description || null,
  });
  if (error) return fail("Não foi possível salvar agora. Tente de novo.");
  return ok(type === "expense" ? "Gasto salvo." : "Entrada salva.");
}

export async function deleteMovement(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const table = str(fd, "source") === "card_purchase" ? "card_purchases" : "transactions";
  const supabase = await db();
  await supabase.from(table).delete().eq("id", id).eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

// ---------- cartões --------------------------------------------------

export async function saveCard(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name").slice(0, 40);
  const closing = day(str(fd, "closing_day"));
  const due = day(str(fd, "due_day"));
  const limitRaw = str(fd, "limit");
  const limit = limitRaw ? parseToCents(limitRaw) : null;
  if (!name) return fail("Dê um nome ao cartão, como Nubank.");
  if (!closing || !due) return fail("Informe o dia de fechamento e o de vencimento.");
  if (limitRaw && limit === null) return fail("Limite inválido.");
  const supabase = await db();
  const { error } = await supabase
    .from("credit_cards")
    .insert({ user_id: OWNER_ID, name, closing_day: closing, due_day: due, limit_cents: limit });
  if (error) return fail("Não foi possível salvar o cartão.");
  return ok("Cartão salvo.");
}

export async function archiveCard(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  await supabase.from("credit_cards").update({ is_archived: true }).eq("id", id).eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

export async function payStatement(fd: FormData) {
  const cardId = optUuid(str(fd, "card_id"));
  const month = str(fd, "month");
  const amount = Number(str(fd, "amount"));
  if (!cardId || !MONTH.test(month) || !Number.isInteger(amount) || amount <= 0) return;
  const supabase = await db();
  await supabase
    .from("card_statement_payments")
    .insert({ user_id: OWNER_ID, card_id: cardId, statement_month: month, amount_cents: amount, paid_on: todayISO() });
  revalidatePath("/app", "layout");
}

export async function unpayStatement(fd: FormData) {
  const cardId = optUuid(str(fd, "card_id"));
  const month = str(fd, "month");
  if (!cardId || !MONTH.test(month)) return;
  const supabase = await db();
  await supabase
    .from("card_statement_payments")
    .delete()
    .eq("user_id", OWNER_ID)
    .eq("card_id", cardId)
    .eq("statement_month", month);
  revalidatePath("/app", "layout");
}

// ---------- contas fixas --------------------------------------------

export async function saveBill(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name").slice(0, 60);
  const amount = parseToCents(str(fd, "amount"));
  const due = day(str(fd, "due_day"));
  const endsOn = str(fd, "ends_on");
  if (!name) return fail("Dê um nome à conta, como Luz.");
  if (!amount || amount <= 0) return fail("Digite o valor da conta.");
  if (!due) return fail("Informe o dia de vencimento.");
  const supabase = await db();
  const { error } = await supabase.from("bills").insert({
    user_id: OWNER_ID,
    name,
    amount_cents: amount,
    due_day: due,
    category_id: optUuid(str(fd, "category_id")),
    starts_on: "2000-01-01",
    ends_on: ISO_DATE.test(endsOn) ? endsOn : null,
  });
  if (error) return fail("Não foi possível salvar a conta.");
  return ok("Conta salva.");
}

export async function archiveBill(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  await supabase.from("bills").update({ is_active: false }).eq("id", id).eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

export async function toggleBillPaid(fd: FormData) {
  const id = optUuid(str(fd, "bill_id"));
  const month = str(fd, "reference_month");
  const amount = Number(str(fd, "amount"));
  if (!id || !MONTH.test(month)) return;
  const supabase = await db();
  if (str(fd, "paid") === "true") {
    await supabase
      .from("bill_payments")
      .delete()
      .eq("bill_id", id)
      .eq("reference_month", month)
      .eq("user_id", OWNER_ID);
  } else if (Number.isInteger(amount) && amount > 0) {
    await supabase
      .from("bill_payments")
      .insert({ user_id: OWNER_ID, bill_id: id, reference_month: month, amount_cents: amount, paid_on: todayISO() });
  }
  revalidatePath("/app", "layout");
}

// ---------- entradas fixas ------------------------------------------

export async function saveIncome(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name").slice(0, 60);
  const amount = parseToCents(str(fd, "amount"));
  const dom = day(str(fd, "day_of_month"));
  const endsOn = str(fd, "ends_on");
  if (!name) return fail("Dê um nome, como Salário.");
  if (!amount || amount <= 0) return fail("Digite o valor.");
  if (!dom) return fail("Informe o dia em que cai.");
  const supabase = await db();
  const { error } = await supabase.from("recurring_incomes").insert({
    user_id: OWNER_ID,
    name,
    amount_cents: amount,
    day_of_month: dom,
    starts_on: "2000-01-01",
    ends_on: ISO_DATE.test(endsOn) ? endsOn : null,
  });
  if (error) return fail("Não foi possível salvar a entrada.");
  return ok("Entrada fixa salva.");
}

export async function archiveIncome(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  await supabase.from("recurring_incomes").update({ is_active: false }).eq("id", id).eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

export async function receiveIncome(fd: FormData) {
  const id = optUuid(str(fd, "income_id"));
  if (!id) return;
  const supabase = await db();
  const { data: income } = await supabase
    .from("recurring_incomes")
    .select("name, amount_cents")
    .eq("id", id)
    .eq("user_id", OWNER_ID)
    .maybeSingle();
  if (!income) return;
  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", OWNER_ID)
    .eq("kind", "income")
    .eq("name", /sal[aá]rio/i.test(income.name) ? "Salário" : "Outros")
    .maybeSingle();
  await supabase.from("transactions").insert({
    user_id: OWNER_ID,
    type: "income",
    amount_cents: income.amount_cents,
    occurred_on: todayISO(),
    description: income.name,
    recurring_income_id: id,
    category_id: cat?.id ?? null,
  });
  revalidatePath("/app", "layout");
}

// ---------- metas ----------------------------------------------------

export async function saveGoal(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name").slice(0, 60);
  const target = parseToCents(str(fd, "target"));
  const kind = str(fd, "kind") === "emergency" ? "emergency" : "custom";
  const targetDate = str(fd, "target_date");
  if (!name) return fail("Dê um nome à meta.");
  if (!target || target <= 0) return fail("Digite quanto quer juntar.");
  const supabase = await db();
  const { error } = await supabase.from("goals").insert({
    user_id: OWNER_ID,
    name,
    kind,
    target_cents: target,
    target_date: ISO_DATE.test(targetDate) ? targetDate : null,
  });
  if (error) {
    return fail(error.code === "23505" ? "Você já tem uma reserva de emergência." : "Não foi possível salvar a meta.");
  }
  return ok("Meta criada.");
}

export async function contributeGoal(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optUuid(str(fd, "goal_id"));
  const amount = parseToCents(str(fd, "amount"));
  const withdraw = str(fd, "direction") === "out";
  if (!id) return fail("Meta inválida.");
  if (!amount || amount <= 0) return fail("Digite um valor.");
  const supabase = await db();
  const { error } = await supabase.from("goal_contributions").insert({
    user_id: OWNER_ID,
    goal_id: id,
    amount_cents: withdraw ? -amount : amount,
    contributed_on: todayISO(),
  });
  if (error) return fail("Não foi possível salvar.");
  return ok(withdraw ? "Retirada registrada." : "Valor guardado.");
}

export async function archiveGoal(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  await supabase.from("goals").update({ is_archived: true }).eq("id", id).eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

// ---------- agenda e tarefas ----------------------------------------

export async function saveEvent(_prev: FormState, fd: FormData): Promise<FormState> {
  const title = str(fd, "title").slice(0, 80);
  const date = str(fd, "date");
  const time = str(fd, "time");
  const kind = ["exam", "appointment", "deadline", "bill", "other"].includes(str(fd, "kind"))
    ? str(fd, "kind")
    : "other";
  if (!title) return fail("Escreva o que é, como Prova de Estatística.");
  if (!ISO_DATE.test(date)) return fail("Escolha a data.");
  const hasTime = /^\d{2}:\d{2}$/.test(time);
  const startsAt = `${date}T${hasTime ? time : "12:00"}:00-03:00`;
  const supabase = await db();
  const { error } = await supabase.from("events").insert({
    user_id: OWNER_ID,
    title,
    kind,
    starts_at: startsAt,
    all_day: !hasTime,
    notes: str(fd, "notes").slice(0, 500) || null,
  });
  if (error) return fail("Não foi possível salvar.");
  return ok("Prazo salvo.");
}

export async function toggleEventDone(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  await supabase
    .from("events")
    .update({ done_at: str(fd, "done") === "true" ? null : new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

export async function deleteEvent(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  await supabase.from("events").delete().eq("id", id).eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

export async function saveTask(_prev: FormState, fd: FormData): Promise<FormState> {
  const title = str(fd, "title").slice(0, 120);
  const priority = [1, 2, 3].includes(Number(str(fd, "priority"))) ? Number(str(fd, "priority")) : 2;
  const due = str(fd, "due_on");
  if (!title) return fail("Escreva a tarefa.");
  const supabase = await db();
  const { error } = await supabase
    .from("tasks")
    .insert({ user_id: OWNER_ID, title, priority, due_on: ISO_DATE.test(due) ? due : null });
  if (error) return fail("Não foi possível salvar.");
  return ok("Tarefa salva.");
}

export async function toggleTask(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  await supabase
    .from("tasks")
    .update({ done_at: str(fd, "done") === "true" ? null : new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

export async function deleteTask(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  await supabase.from("tasks").delete().eq("id", id).eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

// ---------- hábitos --------------------------------------------------

export async function saveHabit(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name").slice(0, 60);
  const target = Math.min(7, Math.max(1, Number(str(fd, "target_per_week")) || 7));
  if (!name) return fail("Escreva o hábito, como Beber 2 L de água.");
  const supabase = await db();
  const { error } = await supabase.from("habits").insert({ user_id: OWNER_ID, name, target_per_week: target });
  if (error) return fail("Não foi possível salvar.");
  return ok("Hábito criado.");
}

export async function toggleHabit(fd: FormData) {
  const id = optUuid(str(fd, "habit_id"));
  const date = str(fd, "date") || todayISO();
  if (!id || !ISO_DATE.test(date)) return;
  const supabase = await db();
  if (str(fd, "checked") === "true") {
    await supabase.from("habit_checks").delete().eq("habit_id", id).eq("checked_on", date).eq("user_id", OWNER_ID);
  } else {
    await supabase.from("habit_checks").insert({ user_id: OWNER_ID, habit_id: id, checked_on: date });
  }
  revalidatePath("/app", "layout");
}

export async function archiveHabit(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  await supabase.from("habits").update({ is_archived: true }).eq("id", id).eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

// ---------- primeiros passos ----------------------------------------

export async function finishOnboarding() {
  const supabase = await db();
  await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", OWNER_ID);
  revalidatePath("/app", "layout");
}
