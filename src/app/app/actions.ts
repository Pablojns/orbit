"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { parseToCents } from "@/lib/money";
import { fromISODate, todayInSaoPaulo, toISODate } from "@/lib/dates";
import { installmentPlan } from "@/lib/schedule";
import { currentCycle } from "@/lib/cycle";
import { requireProfile } from "@/lib/profile";

// Fixos valem a partir do início do ciclo em que foram cadastrados:
// contam no ciclo atual (mesmo se o dia já passou), mas não aparecem em ciclos antigos.
async function currentCycleStartISO() {
  const profile = await requireProfile();
  return toISODate(currentCycle(todayInSaoPaulo(), profile.cycleStartDay).start);
}

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
    starts_on: await currentCycleStartISO(),
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
    starts_on: await currentCycleStartISO(),
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

// =====================================================================
// EDIÇÃO
// =====================================================================

async function rebuildInstallments(
  supabase: Awaited<ReturnType<typeof db>>,
  purchase: { id: string; card_id: string; total_cents: number; installments_count: number; purchased_on: string },
  card: { closing_day: number; due_day: number },
) {
  await supabase.from("installments").delete().eq("purchase_id", purchase.id).eq("user_id", OWNER_ID);
  const plan = installmentPlan(
    fromISODate(purchase.purchased_on),
    Number(purchase.total_cents),
    purchase.installments_count,
    card.closing_day,
    card.due_day,
  );
  return supabase.from("installments").insert(
    plan.map((p) => ({
      user_id: OWNER_ID,
      purchase_id: purchase.id,
      card_id: purchase.card_id,
      number: p.number,
      amount_cents: p.amountCents,
      statement_month: p.statementMonth,
    })),
  );
}

export async function updateMovement(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optUuid(str(fd, "id"));
  const source = str(fd, "source");
  const amount = parseToCents(str(fd, "amount"));
  const occurredOn = str(fd, "occurred_on");
  const description = str(fd, "description").slice(0, 120);
  const categoryId = optUuid(str(fd, "category_id"));
  if (!id) return fail("Lançamento inválido.");
  if (!amount || amount <= 0) return fail("Digite um valor, como 25,90.");
  if (!ISO_DATE.test(occurredOn)) return fail("Escolha a data.");
  const supabase = await db();

  if (source === "card_purchase") {
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
      .update({
        card_id: cardId,
        description: description || "Compra no cartão",
        total_cents: amount,
        installments_count: count,
        purchased_on: occurredOn,
        category_id: categoryId,
      })
      .eq("id", id)
      .eq("user_id", OWNER_ID)
      .select("id, card_id, total_cents, installments_count, purchased_on")
      .single();
    if (error || !purchase) return fail("Não foi possível salvar.");
    const { error: instError } = await rebuildInstallments(supabase, purchase, card);
    if (instError) return fail("Não foi possível atualizar as parcelas.");
    return ok("Compra atualizada.");
  }

  const method = str(fd, "payment_method");
  const { data: current } = await supabase
    .from("transactions")
    .select("type")
    .eq("id", id)
    .eq("user_id", OWNER_ID)
    .maybeSingle();
  const { error } = await supabase
    .from("transactions")
    .update({
      amount_cents: amount,
      occurred_on: occurredOn,
      description: description || null,
      category_id: categoryId,
      payment_method: current?.type === "expense" && PAYMENT_METHODS.has(method) ? method : null,
    })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  if (error) return fail("Não foi possível salvar.");
  return ok("Lançamento atualizado.");
}

export async function updateCard(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optUuid(str(fd, "id"));
  const name = str(fd, "name").slice(0, 40);
  const closing = day(str(fd, "closing_day"));
  const due = day(str(fd, "due_day"));
  const limitRaw = str(fd, "limit");
  const limit = limitRaw ? parseToCents(limitRaw) : null;
  if (!id) return fail("Cartão inválido.");
  if (!name) return fail("Dê um nome ao cartão.");
  if (!closing || !due) return fail("Informe o fechamento e o vencimento.");
  if (limitRaw && limit === null) return fail("Limite inválido.");
  const supabase = await db();
  const { data: before } = await supabase
    .from("credit_cards")
    .select("closing_day, due_day")
    .eq("id", id)
    .eq("user_id", OWNER_ID)
    .maybeSingle();
  const { error } = await supabase
    .from("credit_cards")
    .update({ name, closing_day: closing, due_day: due, limit_cents: limit })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  if (error) return fail("Não foi possível salvar.");

  // Mudou fechamento ou vencimento: recalcula em que fatura cada parcela cai.
  if (before && (before.closing_day !== closing || before.due_day !== due)) {
    const { data: purchases } = await supabase
      .from("card_purchases")
      .select("id, card_id, total_cents, installments_count, purchased_on")
      .eq("card_id", id)
      .eq("user_id", OWNER_ID);
    for (const p of purchases ?? []) {
      await rebuildInstallments(supabase, p, { closing_day: closing, due_day: due });
    }
  }
  return ok("Cartão atualizado.");
}

export async function updateBill(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optUuid(str(fd, "id"));
  const name = str(fd, "name").slice(0, 60);
  const amount = parseToCents(str(fd, "amount"));
  const due = day(str(fd, "due_day"));
  const endsOn = str(fd, "ends_on");
  if (!id) return fail("Conta inválida.");
  if (!name) return fail("Dê um nome à conta.");
  if (!amount || amount <= 0) return fail("Digite o valor.");
  if (!due) return fail("Informe o vencimento.");
  const supabase = await db();
  const { error } = await supabase
    .from("bills")
    .update({
      name,
      amount_cents: amount,
      due_day: due,
      category_id: optUuid(str(fd, "category_id")),
      ends_on: ISO_DATE.test(endsOn) ? endsOn : null,
    })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  if (error) return fail("Não foi possível salvar.");
  return ok("Conta atualizada.");
}

export async function updateIncome(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optUuid(str(fd, "id"));
  const name = str(fd, "name").slice(0, 60);
  const amount = parseToCents(str(fd, "amount"));
  const dom = day(str(fd, "day_of_month"));
  const endsOn = str(fd, "ends_on");
  if (!id) return fail("Entrada inválida.");
  if (!name) return fail("Dê um nome.");
  if (!amount || amount <= 0) return fail("Digite o valor.");
  if (!dom) return fail("Informe o dia.");
  const supabase = await db();
  const { error } = await supabase
    .from("recurring_incomes")
    .update({ name, amount_cents: amount, day_of_month: dom, ends_on: ISO_DATE.test(endsOn) ? endsOn : null })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  if (error) return fail("Não foi possível salvar.");
  return ok("Entrada atualizada.");
}

export async function updateGoal(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optUuid(str(fd, "id"));
  const name = str(fd, "name").slice(0, 60);
  const target = parseToCents(str(fd, "target"));
  const targetDate = str(fd, "target_date");
  if (!id) return fail("Meta inválida.");
  if (!name) return fail("Dê um nome à meta.");
  if (!target || target <= 0) return fail("Digite o valor da meta.");
  const supabase = await db();
  const { error } = await supabase
    .from("goals")
    .update({ name, target_cents: target, target_date: ISO_DATE.test(targetDate) ? targetDate : null })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  if (error) return fail("Não foi possível salvar.");
  return ok("Meta atualizada.");
}

export async function updateHabit(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optUuid(str(fd, "id"));
  const name = str(fd, "name").slice(0, 60);
  const target = Math.min(7, Math.max(1, Number(str(fd, "target_per_week")) || 7));
  if (!id) return fail("Hábito inválido.");
  if (!name) return fail("Escreva o hábito.");
  const supabase = await db();
  const { error } = await supabase
    .from("habits")
    .update({ name, target_per_week: target })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  if (error) return fail("Não foi possível salvar.");
  return ok("Hábito atualizado.");
}

export async function updateEvent(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optUuid(str(fd, "id"));
  const title = str(fd, "title").slice(0, 80);
  const date = str(fd, "date");
  const time = str(fd, "time");
  const kind = ["exam", "appointment", "deadline", "bill", "other"].includes(str(fd, "kind"))
    ? str(fd, "kind")
    : "other";
  if (!id) return fail("Prazo inválido.");
  if (!title) return fail("Escreva o que é.");
  if (!ISO_DATE.test(date)) return fail("Escolha a data.");
  const hasTime = /^\d{2}:\d{2}$/.test(time);
  const supabase = await db();
  const { error } = await supabase
    .from("events")
    .update({
      title,
      kind,
      starts_at: `${date}T${hasTime ? time : "12:00"}:00-03:00`,
      all_day: !hasTime,
      notes: str(fd, "notes").slice(0, 500) || null,
    })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  if (error) return fail("Não foi possível salvar.");
  return ok("Prazo atualizado.");
}

export async function updateTask(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optUuid(str(fd, "id"));
  const title = str(fd, "title").slice(0, 120);
  const priority = [1, 2, 3].includes(Number(str(fd, "priority"))) ? Number(str(fd, "priority")) : 2;
  const due = str(fd, "due_on");
  if (!id) return fail("Tarefa inválida.");
  if (!title) return fail("Escreva a tarefa.");
  const supabase = await db();
  const { error } = await supabase
    .from("tasks")
    .update({ title, priority, due_on: ISO_DATE.test(due) ? due : null })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  if (error) return fail("Não foi possível salvar.");
  return ok("Tarefa atualizada.");
}

// =====================================================================
// CATEGORIAS PRÓPRIAS
// =====================================================================

const CATEGORY_ICONS = new Set([
  "utensils",
  "shopping-basket",
  "bus",
  "home",
  "receipt",
  "gamepad-2",
  "heart-pulse",
  "graduation-cap",
  "shopping-bag",
  "repeat",
  "briefcase",
  "sparkles",
  "circle",
  "paw-print",
  "dumbbell",
  "plane",
  "gift",
  "car",
  "baby",
  "shirt",
  "smartphone",
  "coffee",
  "beer",
  "book-open",
  "wrench",
  "piggy-bank",
]);

export async function saveCategory(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name").slice(0, 40);
  const kind = str(fd, "kind") === "income" ? "income" : "expense";
  const icon = CATEGORY_ICONS.has(str(fd, "icon")) ? str(fd, "icon") : "circle";
  if (!name) return fail("Dê um nome à categoria.");
  const supabase = await db();
  const { data: existing } = await supabase
    .from("categories")
    .select("id, is_archived")
    .eq("user_id", OWNER_ID)
    .eq("kind", kind)
    .ilike("name", name)
    .maybeSingle();
  if (existing?.is_archived) {
    await supabase.from("categories").update({ is_archived: false, icon }).eq("id", existing.id);
    return ok("Categoria reativada.");
  }
  if (existing) return fail("Essa categoria já existe.");
  const { error } = await supabase.from("categories").insert({ user_id: OWNER_ID, name, kind, icon });
  if (error) return fail("Não foi possível salvar.");
  return ok("Categoria criada.");
}

export async function archiveCategory(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  await supabase.from("categories").update({ is_archived: true }).eq("id", id).eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

// =====================================================================
// LEMBRETES (notificação no celular/computador)
// =====================================================================

export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
  if (!/^https:\/\//.test(sub.endpoint) || !sub.p256dh || !sub.auth) return { ok: false };
  const supabase = await db();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: OWNER_ID, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { onConflict: "endpoint" },
    );
  return { ok: !error };
}

export async function deletePushSubscription(endpoint: string) {
  const supabase = await db();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", OWNER_ID);
  return { ok: true };
}
