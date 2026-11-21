"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { formatCents, parseToCents } from "@/lib/money";
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
export type UndoResult = { trashId: string; message: string };

const EVENT_KINDS = new Set(["exam", "appointment", "deadline", "bill", "other", "study"]);
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

export async function deleteMovement(fd: FormData): Promise<UndoResult | void> {
  if (str(fd, "source") === "bill_payment") {
    // Conta paga no Extrato: apagar = desfazer o "Paguei" (com Desfazer por 6 segundos).
    const [billId, month] = str(fd, "id").split("|");
    if (!optUuid(billId) || !MONTH.test(month ?? "")) return;
    const supabase = await db();
    const { data: rows } = await supabase
      .from("bill_payments")
      .select("*")
      .eq("bill_id", billId)
      .eq("reference_month", month)
      .eq("user_id", OWNER_ID);
    if (!rows?.length) return;
    return deleteWithUndo(
      [{ table: "bill_payments", rows }],
      () => supabase.from("bill_payments").delete().eq("bill_id", billId).eq("reference_month", month).eq("user_id", OWNER_ID),
      "Pagamento desfeito.",
    );
  }
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  if (str(fd, "source") === "card_purchase") {
    const [{ data: purchase }, { data: inst }] = await Promise.all([
      supabase.from("card_purchases").select("*").eq("id", id).eq("user_id", OWNER_ID),
      supabase.from("installments").select("*").eq("purchase_id", id).eq("user_id", OWNER_ID),
    ]);
    if (!purchase?.length) return;
    return deleteWithUndo(
      [
        { table: "card_purchases", rows: purchase },
        { table: "installments", rows: inst ?? [] },
      ],
      () => supabase.from("card_purchases").delete().eq("id", id).eq("user_id", OWNER_ID),
      "Compra apagada.",
    );
  }
  const { data: rows } = await supabase.from("transactions").select("*").eq("id", id).eq("user_id", OWNER_ID);
  if (!rows?.length) return;
  return deleteWithUndo(
    [{ table: "transactions", rows }],
    () => supabase.from("transactions").delete().eq("id", id).eq("user_id", OWNER_ID),
    "Lançamento apagado.",
  );
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

export async function archiveCard(fd: FormData): Promise<UndoResult | void> {
  return archiveWithUndo(fd, "credit_cards", "is_archived", true, "Cartão removido.");
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

// Conta dividida saiu do app (21/11): toda conta grava como inteira.
function billExtras(fd: FormData) {
  const code = str(fd, "payment_code").replace(/\s+/g, " ").slice(0, 400);
  return {
    values: {
      split: "none",
      my_share_cents: null,
      is_subscription: str(fd, "is_subscription") === "on",
      payment_code: code || null,
    },
  } as const;
}

export async function saveBill(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name").slice(0, 60);
  const amount = parseToCents(str(fd, "amount"));
  const due = day(str(fd, "due_day"));
  const endsOn = str(fd, "ends_on");
  if (!name) return fail("Dê um nome à conta, como Luz.");
  if (!amount || amount <= 0) return fail("Digite o valor da conta.");
  if (!due) return fail("Informe o dia de vencimento.");
  const extra = billExtras(fd);
  const supabase = await db();
  const { error } = await supabase.from("bills").insert({
    user_id: OWNER_ID,
    name,
    amount_cents: amount,
    due_day: due,
    category_id: optUuid(str(fd, "category_id")),
    starts_on: await currentCycleStartISO(),
    ends_on: ISO_DATE.test(endsOn) ? endsOn : null,
    ...extra.values,
  });
  if (error) return fail("Não foi possível salvar a conta.");
  return ok("Conta salva.");
}

export async function archiveBill(fd: FormData): Promise<UndoResult | void> {
  return archiveWithUndo(fd, "bills", "is_active", false, "Conta removida.");
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

export async function archiveIncome(fd: FormData): Promise<UndoResult | void> {
  return archiveWithUndo(fd, "recurring_incomes", "is_active", false, "Entrada removida.");
}

// Primeiro acesso: "Seu salário deste mês já caiu? Quanto?". Lança a entrada no dia do
// salário deste ciclo (a data certa), para o primeiro ciclo não começar negativo.
export async function saveFirstSalary(_prev: FormState, fd: FormData): Promise<FormState> {
  const amount = parseToCents(str(fd, "amount"));
  if (!amount || amount <= 0 || amount > 10_000_000_000) return fail("Digite quanto caiu, como 2.800.");
  const supabase = await db();
  const [{ data: cat }, { data: salary }] = await Promise.all([
    supabase.from("categories").select("id").eq("user_id", OWNER_ID).eq("kind", "income").eq("name", "Salário").maybeSingle(),
    supabase
      .from("recurring_incomes")
      .select("id, name")
      .eq("user_id", OWNER_ID)
      .eq("is_active", true)
      .ilike("name", "sal%rio%")
      .limit(1)
      .maybeSingle(),
  ]);
  const { error } = await supabase.from("transactions").insert({
    user_id: OWNER_ID,
    type: "income",
    amount_cents: amount,
    occurred_on: await currentCycleStartISO(),
    description: "Salário",
    category_id: cat?.id ?? null,
    recurring_income_id: salary?.id ?? null,
  });
  if (error) return fail("Não foi possível salvar agora. Tente de novo.");
  revalidatePath("/app", "layout");
  return ok("Salário lançado.");
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
    .eq("name", /sal[aá]rio|\bvale\b|adiantamento/i.test(income.name) ? "Salário" : "Outros")
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

export async function archiveGoal(fd: FormData): Promise<UndoResult | void> {
  return archiveWithUndo(fd, "goals", "is_archived", true, "Meta arquivada.");
}

// ---------- agenda e tarefas ----------------------------------------

// Tipo escolhido no formulário (ou, sem tipo, o tipo padrão do comportamento pedido).
async function resolveType(supabase: Awaited<ReturnType<typeof db>>, fd: FormData) {
  const typeId = optUuid(str(fd, "type_id"));
  const askedKind = EVENT_KINDS.has(str(fd, "kind")) ? str(fd, "kind") : "other";
  if (typeId) {
    const { data } = await supabase
      .from("event_types")
      .select("id, base_kind")
      .eq("id", typeId)
      .eq("user_id", OWNER_ID)
      .maybeSingle();
    if (data) return { typeId: data.id as string, kind: data.base_kind as string };
  }
  const { data } = await supabase
    .from("event_types")
    .select("id")
    .eq("user_id", OWNER_ID)
    .eq("base_kind", askedKind)
    .eq("is_archived", false)
    .order("position")
    .limit(1)
    .maybeSingle();
  return { typeId: (data?.id as string | undefined) ?? null, kind: askedKind };
}

const priorityOf = (fd: FormData) => {
  const p = Number(str(fd, "priority"));
  return [1, 2, 3].includes(p) ? p : null;
};

export async function saveEvent(_prev: FormState, fd: FormData): Promise<FormState> {
  const title = str(fd, "title").slice(0, 80);
  const date = str(fd, "date");
  const time = str(fd, "time");
  const supabase = await db();
  const { typeId, kind } = await resolveType(supabase, fd);
  const repeat = str(fd, "repeat");
  const until = str(fd, "repeat_until");
  const remind = Math.min(30, Math.max(0, Number(str(fd, "remind_days")) || 0));
  const sessions = kind === "exam" ? Math.min(8, Math.max(0, Number(str(fd, "study_sessions")) || 0)) : 0;
  if (!title) return fail("Escreva o que é, como Prova de Estatística.");
  if (!ISO_DATE.test(date)) return fail("Escolha a data.");
  const hasTime = /^\d{2}:\d{2}$/.test(time);

  let dates = [date];
  if (repeat === "weekly" || repeat === "biweekly" || repeat === "monthly") {
    if (!ISO_DATE.test(until) || until < date) return fail("Diga até quando repete.");
    dates = repeatDates(date, repeat, until);
    if (dates.length > 60) return fail("Repetição longa demais: no máximo 60 vezes. Diminua o “até quando”.");
  }

  const seriesId = dates.length > 1 || sessions > 0 ? crypto.randomUUID() : null;
  const priority = priorityOf(fd);
  const subjectId = optUuid(str(fd, "subject_id"));
  const rows: Record<string, unknown>[] = dates.map((d) => ({
    user_id: OWNER_ID,
    title,
    kind,
    type_id: typeId,
    priority,
    subject_id: subjectId,
    starts_at: `${d}T${hasTime ? time : "12:00"}:00-03:00`,
    all_day: !hasTime,
    notes: str(fd, "notes").slice(0, 500) || null,
    remind_days: remind,
    series_id: seriesId,
  }));

  if (sessions > 0) {
    const studyDays = await pickStudyDays(supabase, date, sessions);
    const study = new FormData();
    study.set("kind", "study");
    const { typeId: studyType } = await resolveType(supabase, study);
    for (const d of studyDays) {
      rows.push({
        user_id: OWNER_ID,
        title: `Estudar: ${title}`.slice(0, 80),
        kind: "study",
        type_id: studyType,
        starts_at: `${d}T12:00:00-03:00`,
        all_day: true,
        notes: null,
        remind_days: 0,
        series_id: seriesId,
      });
    }
  }

  const { error } = await supabase.from("events").insert(rows);
  if (error) return fail("Não foi possível salvar.");
  if (dates.length > 1) return ok(`${dates.length} datas salvas.`);
  if (sessions > 0) return ok(`Prova salva com ${rows.length - 1} sessões de estudo.`);
  return ok("Salvo na agenda.");
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

export async function deleteEvent(fd: FormData): Promise<UndoResult | void> {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  const whole = str(fd, "series") === "all";
  const { data: ev } = await supabase.from("events").select("*").eq("id", id).eq("user_id", OWNER_ID).maybeSingle();
  if (!ev) return;
  const { data: rows } =
    whole && ev.series_id
      ? await supabase.from("events").select("*").eq("series_id", ev.series_id).eq("user_id", OWNER_ID)
      : { data: [ev] };
  const ids = (rows ?? []).map((r) => r.id);
  const { data: checks } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("parent_type", "event")
    .in("parent_id", ids)
    .eq("user_id", OWNER_ID);
  return deleteWithUndo(
    [
      { table: "events", rows: rows ?? [] },
      { table: "checklist_items", rows: checks ?? [] },
    ],
    async () => {
      await supabase
        .from("checklist_items")
        .delete()
        .eq("parent_type", "event")
        .in("parent_id", ids)
        .eq("user_id", OWNER_ID);
      return supabase.from("events").delete().in("id", ids).eq("user_id", OWNER_ID);
    },
    ids.length > 1 ? `${ids.length} itens apagados.` : "Item apagado.",
  );
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

export async function deleteTask(fd: FormData): Promise<UndoResult | void> {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  const [{ data: rows }, { data: checks }] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", id).eq("user_id", OWNER_ID),
    supabase.from("checklist_items").select("*").eq("parent_type", "task").eq("parent_id", id).eq("user_id", OWNER_ID),
  ]);
  if (!rows?.length) return;
  return deleteWithUndo(
    [
      { table: "tasks", rows },
      { table: "checklist_items", rows: checks ?? [] },
    ],
    async () => {
      await supabase
        .from("checklist_items")
        .delete()
        .eq("parent_type", "task")
        .eq("parent_id", id)
        .eq("user_id", OWNER_ID);
      return supabase.from("tasks").delete().eq("id", id).eq("user_id", OWNER_ID);
    },
    "Tarefa apagada.",
  );
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

export async function archiveHabit(fd: FormData): Promise<UndoResult | void> {
  return archiveWithUndo(fd, "habits", "is_archived", true, "Hábito arquivado.");
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
  const extra = billExtras(fd);
  const supabase = await db();
  const { error } = await supabase
    .from("bills")
    .update({
      name,
      amount_cents: amount,
      due_day: due,
      category_id: optUuid(str(fd, "category_id")),
      ends_on: ISO_DATE.test(endsOn) ? endsOn : null,
      ...extra.values,
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
  const remind = Math.min(30, Math.max(0, Number(str(fd, "remind_days")) || 0));
  if (!id) return fail("Item inválido.");
  if (!title) return fail("Escreva o que é.");
  if (!ISO_DATE.test(date)) return fail("Escolha a data.");
  const hasTime = /^\d{2}:\d{2}$/.test(time);
  const supabase = await db();
  const { typeId, kind } = await resolveType(supabase, fd);
  const { error } = await supabase
    .from("events")
    .update({
      title,
      kind,
      type_id: typeId,
      priority: priorityOf(fd),
      subject_id: optUuid(str(fd, "subject_id")),
      starts_at: `${date}T${hasTime ? time : "12:00"}:00-03:00`,
      all_day: !hasTime,
      notes: str(fd, "notes").slice(0, 500) || null,
      remind_days: remind,
    })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  if (error) return fail("Não foi possível salvar.");
  return ok("Atualizado.");
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

export async function archiveCategory(fd: FormData): Promise<UndoResult | void> {
  return archiveWithUndo(fd, "categories", "is_archived", true, "Categoria removida.");
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

// Um botão só na Agenda: "Tarefa" vira uma tarefa (data opcional); o resto vira um item com data.
// Formulário único da Agenda (21/11): tudo vira item com tipo; tarefa e conta não se criam mais aqui.
export async function saveAgendaItem(prev: FormState, fd: FormData): Promise<FormState> {
  return saveEvent(prev, fd);
}

// ---------- tipos da agenda ----------------------------------------------

const HEX = /^#[0-9A-Fa-f]{6}$/;

export async function saveEventType(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name").slice(0, 40);
  const color = HEX.test(str(fd, "color")) ? str(fd, "color") : "#94A3B8";
  if (!name) return fail("Dê um nome ao tipo, como Academia.");
  const supabase = await db();
  const { count } = await supabase
    .from("event_types")
    .select("id", { count: "exact", head: true })
    .eq("user_id", OWNER_ID);
  const { error } = await supabase
    .from("event_types")
    .insert({ user_id: OWNER_ID, name, color, base_kind: "other", position: (count ?? 0) + 1 });
  if (error) return fail("Não foi possível salvar.");
  return ok("Tipo criado.");
}

export async function updateEventType(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optUuid(str(fd, "id"));
  const name = str(fd, "name").slice(0, 40);
  if (!id) return fail("Tipo inválido.");
  if (!name) return fail("Dê um nome ao tipo.");
  const patch: Record<string, unknown> = { name };
  if (HEX.test(str(fd, "color"))) patch.color = str(fd, "color");
  const supabase = await db();
  const { error } = await supabase.from("event_types").update(patch).eq("id", id).eq("user_id", OWNER_ID);
  if (error) return fail("Não foi possível salvar.");
  return ok("Tipo atualizado.");
}

// "Apagar" um tipo arquiva: os itens antigos continuam com a cor dele, e dá para desfazer.
export async function archiveEventType(fd: FormData) {
  const supabase = await db();
  const { count } = await supabase
    .from("event_types")
    .select("id", { count: "exact", head: true })
    .eq("user_id", OWNER_ID)
    .eq("is_archived", false);
  if ((count ?? 0) <= 1) return;
  return archiveWithUndo(fd, "event_types", "is_archived", true, "Tipo apagado.");
}

// ---------- desfazer ------------------------------------------------------

type TrashOp =
  | { t: "insert"; table: string; rows: Record<string, unknown>[] }
  | { t: "update"; table: string; id: string; patch: Record<string, unknown> };

async function putInTrash(ops: TrashOp[]) {
  const supabase = await db();
  // Guarda só o recente: limpa o que tem mais de 1 dia.
  await supabase
    .from("trash")
    .delete()
    .eq("user_id", OWNER_ID)
    .lt("created_at", new Date(Date.now() - 86_400_000).toISOString());
  const { data } = await supabase.from("trash").insert({ user_id: OWNER_ID, payload: { ops } }).select("id").single();
  return data?.id as string | undefined;
}

async function deleteWithUndo(
  groups: { table: string; rows: Record<string, unknown>[] }[],
  remove: () => PromiseLike<{ error: unknown }>,
  message: string,
): Promise<UndoResult | void> {
  const trashId = await putInTrash(
    groups.filter((g) => g.rows.length).map((g) => ({ t: "insert" as const, table: g.table, rows: g.rows })),
  );
  const { error } = await remove();
  revalidatePath("/app", "layout");
  if (error || !trashId) return;
  return { trashId, message };
}

async function archiveWithUndo(
  fd: FormData,
  table: string,
  column: string,
  value: boolean,
  message: string,
): Promise<UndoResult | void> {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  const { error } = await supabase
    .from(table)
    .update({ [column]: value })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
  if (error) return;
  const trashId = await putInTrash([{ t: "update", table, id, patch: { [column]: !value } }]);
  return trashId ? { trashId, message } : undefined;
}

const RESTORABLE = new Set([
  "transactions",
  "card_purchases",
  "installments",
  "events",
  "tasks",
  "checklist_items",
  "debts",
  "grades",
  "subjects",
  "credit_cards",
  "bills",
  "recurring_incomes",
  "goals",
  "habits",
  "categories",
  "event_types",
  "class_slots",
  "bill_payments",
]);

export async function restoreTrash(trashId: string) {
  if (!UUID.test(trashId)) return { ok: false };
  const supabase = await db();
  const { data } = await supabase
    .from("trash")
    .select("payload")
    .eq("id", trashId)
    .eq("user_id", OWNER_ID)
    .maybeSingle();
  const ops = ((data?.payload as { ops?: TrashOp[] } | null)?.ops ?? []) as TrashOp[];
  for (const op of ops) {
    if (!RESTORABLE.has(op.table)) continue;
    if (op.t === "insert") {
      const rows = op.rows.map((r) => ({ ...r, user_id: OWNER_ID }));
      if (rows.length) await supabase.from(op.table).insert(rows);
    } else if (UUID.test(op.id)) {
      await supabase.from(op.table).update(op.patch).eq("id", op.id).eq("user_id", OWNER_ID);
    }
  }
  await supabase.from("trash").delete().eq("id", trashId).eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
  return { ok: true };
}

// ---------- repetição e plano de estudo -----------------------------------

function addDaysISO(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function repeatDates(start: string, repeat: string, until: string) {
  const out: string[] = [];
  if (repeat === "monthly") {
    const [y, m, d] = start.split("-").map(Number);
    for (let i = 0; i < 61; i++) {
      const total = m - 1 + i;
      const yy = y + Math.floor(total / 12);
      const mm = (total % 12) + 1;
      const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
      const iso = `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
      if (iso > until) break;
      out.push(iso);
    }
    return out;
  }
  const step = repeat === "biweekly" ? 14 : 7;
  for (let iso = start, i = 0; iso <= until && i < 61; iso = addDaysISO(iso, step), i++) out.push(iso);
  return out;
}

// Espalha as sessões entre amanhã e a véspera da prova, fugindo dos dias que já têm algo.
async function pickStudyDays(supabase: Awaited<ReturnType<typeof db>>, examDate: string, n: number) {
  const first = addDaysISO(todayISO(), 1);
  const last = addDaysISO(examDate, -1);
  const days: string[] = [];
  for (let d = first; d <= last && days.length < 120; d = addDaysISO(d, 1)) days.push(d);
  if (!days.length) return [];
  const { data } = await supabase
    .from("events")
    .select("starts_at")
    .eq("user_id", OWNER_ID)
    .gte("starts_at", `${first}T00:00:00-03:00`)
    .lte("starts_at", `${last}T23:59:59-03:00`);
  const busy = new Set(
    (data ?? []).map((e) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(e.starts_at)),
    ),
  );
  const count = Math.min(n, days.length);
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    // posição ideal, espalhada até a véspera
    const ideal = Math.round(((i + 1) * days.length) / count) - 1;
    let best = -1;
    for (let off = 0; off < days.length && best < 0; off++) {
      for (const j of [ideal - off, ideal + off]) {
        if (j >= 0 && j < days.length && !picked.includes(days[j]) && !busy.has(days[j])) {
          best = j;
          break;
        }
      }
    }
    if (best < 0) {
      // todos ocupados: aceita dia ocupado
      for (let off = 0; off < days.length && best < 0; off++) {
        for (const j of [ideal - off, ideal + off]) {
          if (j >= 0 && j < days.length && !picked.includes(days[j])) {
            best = j;
            break;
          }
        }
      }
    }
    if (best >= 0) picked.push(days[best]);
  }
  return picked.sort();
}

// ---------- checklist dentro de prova ou tarefa ---------------------------

export async function addChecklistItem(fd: FormData) {
  const parentType = str(fd, "parent_type") === "task" ? "task" : "event";
  const parentId = optUuid(str(fd, "parent_id"));
  const text = str(fd, "text").slice(0, 120);
  if (!parentId || !text) return;
  const supabase = await db();
  await supabase
    .from("checklist_items")
    .insert({ user_id: OWNER_ID, parent_type: parentType, parent_id: parentId, text });
  revalidatePath("/app", "layout");
}

export async function toggleChecklistItem(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  await supabase
    .from("checklist_items")
    .update({ done: str(fd, "done") !== "true" })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

export async function deleteChecklistItem(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  await supabase.from("checklist_items").delete().eq("id", id).eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

// ---------- quem me deve / quem eu devo -----------------------------------

export async function saveDebt(_prev: FormState, fd: FormData): Promise<FormState> {
  const person = str(fd, "person").slice(0, 60);
  const direction = str(fd, "direction") === "i_owe" ? "i_owe" : "owed_to_me";
  const amount = parseToCents(str(fd, "amount"));
  const date = str(fd, "occurred_on");
  if (!person) return fail("Escreva o nome da pessoa.");
  if (!amount || amount <= 0) return fail("Digite o valor.");
  const supabase = await db();
  const { error } = await supabase.from("debts").insert({
    user_id: OWNER_ID,
    person,
    direction,
    amount_cents: amount,
    note: str(fd, "note").slice(0, 120) || null,
    occurred_on: ISO_DATE.test(date) ? date : todayISO(),
  });
  if (error) return fail("Não foi possível salvar.");
  return ok(direction === "i_owe" ? "Anotado: você deve." : "Anotado: te devem.");
}

export async function updateDebt(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optUuid(str(fd, "id"));
  const person = str(fd, "person").slice(0, 60);
  const amount = parseToCents(str(fd, "amount"));
  if (!id) return fail("Item inválido.");
  if (!person) return fail("Escreva o nome da pessoa.");
  if (!amount || amount <= 0) return fail("Digite o valor.");
  const supabase = await db();
  const { error } = await supabase
    .from("debts")
    .update({
      person,
      amount_cents: amount,
      direction: str(fd, "direction") === "i_owe" ? "i_owe" : "owed_to_me",
      note: str(fd, "note").slice(0, 120) || null,
    })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  if (error) return fail("Não foi possível salvar.");
  return ok("Atualizado.");
}

export async function settleDebt(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  await supabase
    .from("debts")
    .update({ settled_at: str(fd, "settled") === "true" ? null : new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}

export async function deleteDebt(fd: FormData): Promise<UndoResult | void> {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  const { data: rows } = await supabase.from("debts").select("*").eq("id", id).eq("user_id", OWNER_ID);
  if (!rows?.length) return;
  return deleteWithUndo(
    [{ table: "debts", rows }],
    () => supabase.from("debts").delete().eq("id", id).eq("user_id", OWNER_ID),
    "Apagado.",
  );
}

// ---------- notas da faculdade --------------------------------------------

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export async function saveSubject(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name").slice(0, 60);
  const pass = num(str(fd, "pass_grade")) ?? 6;
  const max = num(str(fd, "max_grade")) ?? 10;
  if (!name) return fail("Escreva o nome da matéria.");
  if (pass <= 0 || max <= 0 || pass > max) return fail("A média para passar precisa ser menor que a nota máxima.");
  const supabase = await db();
  const { error } = await supabase
    .from("subjects")
    .insert({ user_id: OWNER_ID, name, pass_grade: pass, max_grade: max, max_absences: maxAbsencesOf(fd) });
  if (error) return fail("Não foi possível salvar.");
  return ok("Matéria criada.");
}

export async function updateSubject(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optUuid(str(fd, "id"));
  const name = str(fd, "name").slice(0, 60);
  const pass = num(str(fd, "pass_grade")) ?? 6;
  const max = num(str(fd, "max_grade")) ?? 10;
  if (!id) return fail("Matéria inválida.");
  if (!name) return fail("Escreva o nome da matéria.");
  if (pass <= 0 || max <= 0 || pass > max) return fail("A média para passar precisa ser menor que a nota máxima.");
  const supabase = await db();
  const { error } = await supabase
    .from("subjects")
    .update({ name, pass_grade: pass, max_grade: max, max_absences: maxAbsencesOf(fd) })
    .eq("id", id)
    .eq("user_id", OWNER_ID);
  if (error) return fail("Não foi possível salvar.");
  return ok("Matéria atualizada.");
}

// Máximo de faltas da matéria: vazio = sem limite.
function maxAbsencesOf(fd: FormData) {
  const raw = str(fd, "max_absences");
  if (!raw) return null;
  const v = Math.round(Number(raw.replace(",", ".")));
  return Number.isFinite(v) && v >= 0 && v <= 500 ? v : null;
}

// Soma ou tira uma falta (delta +1 ou -1).
export async function changeAbsence(fd: FormData) {
  const id = optUuid(str(fd, "id"));
  const delta = str(fd, "delta") === "-1" ? -1 : 1;
  if (!id) return;
  const supabase = await db();
  await supabase.rpc("bump_absences", { p_id: id, p_delta: delta });
  revalidatePath("/app", "layout");
}

// ---------- horário de aulas e semestre ---------------------------------

const HHMM = /^\d{2}:\d{2}$/;

export async function saveClassSlot(_prev: FormState, fd: FormData): Promise<FormState> {
  const subjectId = optUuid(str(fd, "subject_id"));
  const weekday = Number(str(fd, "weekday"));
  const startsAt = str(fd, "starts_at");
  const endsAt = str(fd, "ends_at");
  if (!subjectId) return fail("Escolha a matéria.");
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return fail("Escolha o dia da semana.");
  if (!HHMM.test(startsAt)) return fail("Diga a hora que a aula começa.");
  if (endsAt && (!HHMM.test(endsAt) || endsAt <= startsAt)) return fail("A aula precisa terminar depois de começar.");
  const supabase = await db();
  const { error } = await supabase.from("class_slots").insert({
    user_id: OWNER_ID,
    subject_id: subjectId,
    weekday,
    starts_at: startsAt,
    ends_at: endsAt || null,
    room: str(fd, "room").slice(0, 60) || null,
  });
  if (error) return fail("Não foi possível salvar.");
  return ok("Aula no horário.");
}

export async function deleteClassSlot(fd: FormData): Promise<UndoResult | void> {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  const { data: rows } = await supabase.from("class_slots").select("*").eq("id", id).eq("user_id", OWNER_ID);
  return deleteWithUndo(
    [{ table: "class_slots", rows: rows ?? [] }],
    () => supabase.from("class_slots").delete().eq("id", id).eq("user_id", OWNER_ID),
    "Aula tirada do horário.",
  );
}

export async function saveTerm(_prev: FormState, fd: FormData): Promise<FormState> {
  const startsOn = str(fd, "starts_on");
  const endsOn = str(fd, "ends_on");
  if (!ISO_DATE.test(startsOn) || !ISO_DATE.test(endsOn)) return fail("Escolha as duas datas do semestre.");
  if (endsOn < startsOn) return fail("O fim precisa ser depois do início.");
  const supabase = await db();
  const { error } = await supabase
    .from("study_terms")
    .upsert({ user_id: OWNER_ID, starts_on: startsOn, ends_on: endsOn }, { onConflict: "user_id" });
  if (error) return fail("Não foi possível salvar.");
  return ok("Semestre salvo.");
}

export async function archiveSubject(fd: FormData): Promise<UndoResult | void> {
  return archiveWithUndo(fd, "subjects", "is_archived", true, "Matéria arquivada.");
}

export async function saveGrade(_prev: FormState, fd: FormData): Promise<FormState> {
  const subjectId = optUuid(str(fd, "subject_id"));
  const label = str(fd, "label").slice(0, 60);
  const weight = num(str(fd, "weight")) ?? 1;
  const raw = str(fd, "value");
  const value = raw ? num(raw) : null;
  if (!subjectId) return fail("Matéria inválida.");
  if (!label) return fail("Dê um nome, como Prova 1 ou Trabalho.");
  if (weight <= 0) return fail("O peso precisa ser maior que zero.");
  if (raw && (value === null || value < 0)) return fail("Nota inválida.");
  const supabase = await db();
  const { error } = await supabase
    .from("grades")
    .insert({ user_id: OWNER_ID, subject_id: subjectId, label, weight, value });
  if (error) return fail("Não foi possível salvar.");
  return ok(value === null ? "Avaliação adicionada. Lance a nota quando sair." : "Nota lançada.");
}

export async function updateGrade(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optUuid(str(fd, "id"));
  const label = str(fd, "label").slice(0, 60);
  const weight = num(str(fd, "weight")) ?? 1;
  const raw = str(fd, "value");
  const value = raw ? num(raw) : null;
  if (!id) return fail("Avaliação inválida.");
  if (!label) return fail("Dê um nome à avaliação.");
  if (weight <= 0) return fail("O peso precisa ser maior que zero.");
  if (raw && (value === null || value < 0)) return fail("Nota inválida.");
  const supabase = await db();
  const { error } = await supabase.from("grades").update({ label, weight, value }).eq("id", id).eq("user_id", OWNER_ID);
  if (error) return fail("Não foi possível salvar.");
  return ok("Atualizado.");
}

export async function deleteGrade(fd: FormData): Promise<UndoResult | void> {
  const id = optUuid(str(fd, "id"));
  if (!id) return;
  const supabase = await db();
  const { data: rows } = await supabase.from("grades").select("*").eq("id", id).eq("user_id", OWNER_ID);
  if (!rows?.length) return;
  return deleteWithUndo(
    [{ table: "grades", rows }],
    () => supabase.from("grades").delete().eq("id", id).eq("user_id", OWNER_ID),
    "Avaliação apagada.",
  );
}

// ---------- lançar escrevendo uma frase -----------------------------------

// Resposta da barra: além de salvo/erro, pode ser uma pergunta da IA (cor neutra) com botões.
export type QuickState = FormState & {
  tone?: "info";
  options?: { label: string; force: "expense" | "income" | "event" }[];
  text?: string;
};

const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const info = (message: string, extra: Partial<QuickState> = {}): QuickState => ({
  status: "error",
  tone: "info",
  message,
  ...extra,
});

// Botões para quando a IA fica em dúvida, a partir do que ela perguntou.
function doubtOptions(ask: string, text: string): QuickState {
  const a = ask.toLowerCase();
  const options: NonNullable<QuickState["options"]> = [];
  if (/gasto|gastei|compra|despesa/.test(a)) options.push({ label: "É gasto", force: "expense" });
  if (/entrada|recebi|receb/.test(a)) options.push({ label: "É entrada", force: "income" });
  if (/consulta|compromisso|evento|agenda|lembrete|prova|reuni/.test(a)) options.push({ label: "É compromisso", force: "event" });
  if (options.length < 2) {
    for (const o of [
      { label: "É gasto", force: "expense" as const },
      { label: "É compromisso", force: "event" as const },
    ]) {
      if (!options.some((x) => x.force === o.force)) options.push(o);
    }
  }
  return info(ask, { options, text });
}

export async function quickText(_prev: QuickState, fd: FormData): Promise<QuickState> {
  const text = str(fd, "text").slice(0, 160);
  const force = str(fd, "force");
  if (!text) return fail("Escreva algo como: mercado 45 pix");
  const supabase = await db();
  const [{ data: cats }, { data: cards }] = await Promise.all([
    supabase.from("categories").select("id, name, kind").eq("user_id", OWNER_ID).eq("is_archived", false),
    supabase.from("credit_cards").select("id, name").eq("user_id", OWNER_ID).eq("is_archived", false),
  ]);
  const today = todayInSaoPaulo();
  const { findMoneyDate } = await import("@/lib/money-date");
  const md = findMoneyDate(text, today);

  // Resposta a um botão de dúvida ("É gasto" / "É compromisso"): sem perguntar de novo à IA.
  if (force === "event") {
    const { parseAgendaText } = await import("@/lib/agenda-parse");
    const rule = parseAgendaText(text, today);
    if (!rule) return info("Para quando é? Escreva com o dia, como: dentista sexta 14h.");
    return saveAgendaFromText(rule.title, rule.kind, rule.date, rule.time);
  }
  if (force === "expense" || force === "income") {
    return moneyFromRules(text, force, md, cats ?? [], cards ?? []);
  }

  // 0) Frases de Estudos (nota, falta, aula, plano de estudo) têm padrão fixo: regras primeiro.
  const { parseStudyText } = await import("@/lib/studies-math");
  const study = parseStudyText(text);
  if (study) return studyFromText(study);

  // 0b) Meta, conta fixa, empréstimo e perguntas: regras primeiro.
  const { parseMoneyIntent } = await import("@/lib/money-intents");
  const special = parseMoneyIntent(text);
  if (special) return moneyIntentFromText(special);

  // Falou "semana passada" sem o dia: não dá para adivinhar.
  if (md.kind === "vague") return info("Em que dia foi? Escreva junto, como “dia 12” ou “ontem”.");

  // 1) IA entende a intenção (gasto, entrada, compromisso, pergunta ou dúvida).
  const { interpretWithAI } = await import("@/lib/ai-intent");
  const ai = await interpretWithAI(
    text,
    today,
    (cats ?? []).map((c) => c.name),
    (cards ?? []).map((c) => c.name),
  );
  const aiMissedValue = ai?.intent === "unclear" && ai.ask === "Qual foi o valor?";
  const todayIso = toISODate(today);
  // Data passada + valor nunca é compromisso: é dinheiro ("gasolina 120 no inter dia 2/11").
  const pastMoney =
    md.kind === "found" &&
    md.date < todayIso &&
    /\b\d+(?:[.,]\d{1,2})?\b(?!\s*(?:h\b|hs\b|hrs\b|horas\b|:))/.test(
      text.replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, "").replace(/dia \d{1,2}/gi, ""),
    );
  if (ai && !aiMissedValue) {
    if ((ai.intent === "unclear" || ai.intent === "event") && pastMoney) {
      return moneyFromRules(text, null, md, cats ?? [], cards ?? []);
    }
    if (ai.intent === "unclear") return doubtOptions(ai.ask, text);
    if (ai.intent === "question") {
      return info("Por enquanto eu respondo: quanto posso gastar, qual meu saldo e quanto tenho de fatura.");
    }
    if (ai.intent === "event") {
      // Datas e horas: as regras locais são exatas; a IA só cobre o que elas não acharem.
      // Em repetição, a primeira data vem da IA (as regras não entendem "toda segunda").
      const { parseAgendaText } = await import("@/lib/agenda-parse");
      const rule = parseAgendaText(text, today);
      const date = !ai.repeat && rule?.dateFound ? rule.date : ai.date;
      return saveAgendaFromText(ai.title, ai.kind, date, rule?.time ?? ai.time, {
        repeat: ai.repeat,
        repeatUntil: ai.repeatUntil,
        remindDays: ai.remindDays,
        studySessions: ai.studySessions,
        subject: ai.subject,
      });
    }
    if (ai.intent === "grade" || ai.intent === "absence" || ai.intent === "class" || ai.intent === "study_plan") {
      return studyFromText(ai);
    }
    const card = ai.cardName
      ? (cards ?? []).find((c) => c.name.toLowerCase() === ai.cardName!.toLowerCase())
      : ai.method === "credit" && (cards ?? []).length === 1
        ? cards![0]
        : undefined;
    if (ai.intent === "expense" && ai.method === "credit" && !card) return fail("Em qual cartão? Escreva o nome dele junto.");
    const cat = (cats ?? []).find(
      (c) => c.name.toLowerCase() === (ai.categoryName ?? "").toLowerCase() && c.kind === ai.intent,
    );
    // A data dita na frase manda; sem data na frase, a da IA; sem nenhuma, hoje.
    const date = md.kind === "found" ? md.date : (ai.date ?? todayIso);
    return saveMoneyFromText({
      type: ai.intent,
      amountCents: ai.amountCents,
      date,
      categoryId: cat?.id ?? null,
      categoryName: cat?.name ?? null,
      method: card ? "credit" : ai.method,
      card: card ?? null,
      installments: ai.installments,
      description: stripDateWords(ai.description || text.slice(0, 60), md),
      text,
      cats: cats ?? [],
    });
  }

  // 2) Sem IA (sem chave ou limite atingido): regras locais.
  const { parseAgendaText } = await import("@/lib/agenda-parse");
  const agenda = pastMoney ? null : parseAgendaText(text, today);
  if (agenda) return saveAgendaFromText(agenda.title, agenda.kind, agenda.date, agenda.time);
  return moneyFromRules(text, null, md, cats ?? [], cards ?? []);
}

type MoneyDateResult = import("@/lib/money-date").MoneyDate;

function stripDateWords(description: string, md: MoneyDateResult) {
  if (md.kind === "none") return description;
  const words = new Set(md.words.map((w) => w.toLowerCase()));
  return description
    .split(/\s+/)
    .filter((w) => !words.has(w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")) && !words.has(w.toLowerCase()))
    .join(" ")
    .trim();
}

async function moneyFromRules(
  text: string,
  forceType: "expense" | "income" | null,
  md: MoneyDateResult,
  cats: { id: string; name: string; kind: string }[],
  cards: { id: string; name: string }[],
): Promise<QuickState> {
  const { parseQuickText } = await import("@/lib/quick-parse");
  const clean = text.replace(/\b(?:dia |em )?\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ").replace(/\bdia \d{1,2}\b/gi, " ");
  const parsed = parseQuickText(clean, cats, cards);
  if ("error" in parsed) return fail(parsed.error);
  const type = forceType ?? parsed.type;
  const cat =
    forceType && forceType !== parsed.type ? null : (cats.find((c) => c.id === parsed.categoryId) ?? null);
  const date = md.kind === "found" ? md.date : (parsed.date ?? todayISO());
  return saveMoneyFromText({
    type,
    amountCents: parsed.amountCents,
    date,
    categoryId: cat?.id ?? null,
    categoryName: cat?.name ?? null,
    method: type === "income" ? "pix" : parsed.cardId ? "credit" : parsed.method,
    card: parsed.cardId ? (cards.find((c) => c.id === parsed.cardId) ?? null) : null,
    installments: parsed.installments,
    description: stripDateWords(parsed.description, md),
    text,
    cats,
  });
}

// Grava gasto ou entrada vindo da barra e responde com a data: "Gasto: R$ 32,00 · Alimentação · 19/11".
async function saveMoneyFromText(p: {
  type: "expense" | "income";
  amountCents: number;
  date: string;
  categoryId: string | null;
  categoryName: string | null;
  method: string;
  card: { id: string; name: string } | null;
  installments: number;
  description: string;
  text: string;
  cats: { id: string; name: string; kind: string }[];
}): Promise<QuickState> {
  let categoryId = p.categoryId;
  let categoryName = p.categoryName;
  // "vale", "adiantamento" e "salário" são entrada de salário.
  if (p.type === "income" && /\b(vale|adiantamento|sal[aá]rio)\b/i.test(p.text)) {
    const sal = p.cats.find((c) => c.kind === "income" && c.name === "Salário");
    if (sal) {
      categoryId = sal.id;
      categoryName = sal.name;
    }
  }
  const form = new FormData();
  form.set("type", p.type);
  form.set("amount", (p.amountCents / 100).toFixed(2).replace(".", ","));
  form.set("occurred_on", p.date);
  if (categoryId) form.set("category_id", categoryId);
  form.set("payment_method", p.card ? "credit" : p.method);
  if (p.card) form.set("card_id", p.card.id);
  form.set("installments", String(p.installments));
  form.set("description", capFirst(p.description || p.text.slice(0, 60)));
  const result = await addMovement({ status: "idle" }, form);
  if (result.status !== "saved") return result;
  const { shortDate } = await import("@/lib/money-date");
  const how = p.card
    ? `${p.card.name}${p.installments > 1 ? ` em ${p.installments}x` : ""}`
    : (METHOD_LABEL[p.method] ?? null);
  const valor = formatCents(p.amountCents);
  const when = p.date === todayISO() ? `hoje, ${shortDate(p.date)}` : shortDate(p.date);
  const parts = [`${p.type === "income" ? "Entrada" : "Gasto"}: ${valor}`, categoryName, p.type === "expense" ? how : null, when];
  return { status: "saved", message: `${parts.filter(Boolean).join(" · ")}.` };
}

// Meta, conta fixa, empréstimo e perguntas.
async function moneyIntentFromText(it: import("@/lib/money-intents").MoneyIntent): Promise<QuickState> {
  const supabase = await db();
  if (it.intent === "question") {
    if (it.topic === "other") {
      return info("Por enquanto eu respondo: quanto posso gastar, qual meu saldo e quanto tenho de fatura.");
    }
    const profile = await requireProfile();
    const { getFinance } = await import("@/lib/finance");
    const f = await getFinance(profile.cycleStartDay);
    const s = f.summary;
    const { paydayText } = await import("@/lib/cycle");
    if (it.topic === "per_day") {
      return info(
        s.freeCents < 0
          ? `Neste ciclo está faltando ${formatCents(-s.freeCents)}. ${paydayText(f.cycle)}.`
          : `Pode gastar ${formatCents(s.perDayCents)} por dia. ${paydayText(f.cycle)}.`,
      );
    }
    if (it.topic === "balance") return info(`Seu saldo é ${formatCents(s.balanceCents)}, pelo que foi lançado.`);
    return info(
      f.cards.length
        ? `Fatura aberta: ${formatCents(s.openStatementCents)}.`
        : "Você não tem cartão cadastrado.",
    );
  }
  if (it.intent === "goal_deposit") {
    const { data: goals } = await supabase.from("goals").select("id, name").eq("user_id", OWNER_ID).eq("is_archived", false);
    const { matchByName } = await import("@/lib/money-intents");
    const goal = matchByName(it.goal, goals ?? []);
    if (!goal) return fail(`Não achei a meta “${it.goal}”. Veja o nome em Dinheiro › Metas.`);
    const fd = new FormData();
    fd.set("goal_id", goal.id);
    fd.set("amount", (it.amountCents / 100).toFixed(2).replace(".", ","));
    const r = await contributeGoal({ status: "idle" }, fd);
    if (r.status !== "saved") return r;
    revalidatePath("/app", "layout");
    return { status: "saved", message: `Guardado: ${formatCents(it.amountCents)} em ${goal.name}.` };
  }
  if (it.intent === "fixed_bill") {
    const { data: cats } = await supabase.from("categories").select("id, name").eq("user_id", OWNER_ID).eq("kind", "expense");
    const cat = (cats ?? []).find((c) => c.name === (it.subscription ? "Assinaturas" : "Contas"));
    const fd = new FormData();
    fd.set("name", it.name);
    fd.set("amount", (it.amountCents / 100).toFixed(2).replace(".", ","));
    fd.set("due_day", String(it.dueDay));
    if (cat) fd.set("category_id", cat.id);
    if (it.subscription) fd.set("is_subscription", "on");
    const r = await saveBill({ status: "idle" }, fd);
    if (r.status !== "saved") return r;
    revalidatePath("/app", "layout");
    return {
      status: "saved",
      message: `Conta fixa: ${it.name}, ${formatCents(it.amountCents)} todo dia ${it.dueDay}${it.subscription ? " (assinatura)" : ""}.`,
    };
  }
  const fd = new FormData();
  fd.set("person", it.person);
  fd.set("direction", it.direction);
  fd.set("amount", (it.amountCents / 100).toFixed(2).replace(".", ","));
  if (it.note) fd.set("note", it.note);
  const r = await saveDebt({ status: "idle" }, fd);
  if (r.status !== "saved") return r;
  revalidatePath("/app", "layout");
  return {
    status: "saved",
    message:
      it.direction === "owed_to_me"
        ? `Empréstimos: ${it.person} te deve ${formatCents(it.amountCents)}.`
        : `Empréstimos: você deve ${formatCents(it.amountCents)} para ${it.person}.`,
  };
}

const METHOD_LABEL: Record<string, string> = {
  pix: "Pix",
  debit: "Débito",
  credit: "Crédito",
  cash: "Dinheiro",
  transfer: "Transferência",
};

type AgendaExtras = {
  repeat?: "weekly" | "biweekly" | "monthly" | null;
  repeatUntil?: string | null;
  remindDays?: number | null;
  studySessions?: number | null;
  subject?: string | null;
};

const REPEAT_LABEL = { weekly: "toda semana", biweekly: "a cada 2 semanas", monthly: "todo mês" } as const;

async function saveAgendaFromText(
  title: string,
  kind: string,
  date: string,
  time: string | null,
  extra: AgendaExtras = {},
): Promise<FormState> {
  const form = new FormData();
  form.set("title", title);
  form.set("date", date);
  if (time) form.set("time", time);
  form.set("kind", kind);
  let until: string | null = null;
  if (extra.repeat) {
    const { getTerm } = await import("@/lib/class-slots");
    const { defaultRepeatUntil } = await import("@/lib/studies-math");
    until = extra.repeatUntil ?? defaultRepeatUntil(date, await getTerm());
    form.set("repeat", extra.repeat);
    form.set("repeat_until", until);
  }
  if (extra.remindDays !== null && extra.remindDays !== undefined) form.set("remind_days", String(extra.remindDays));
  else if (kind === "exam") form.set("remind_days", "3");
  if (extra.studySessions && kind === "exam" && !extra.repeat) form.set("study_sessions", String(extra.studySessions));
  if (extra.subject) {
    const { getSubjects } = await import("@/lib/studies");
    const { matchSubject } = await import("@/lib/studies-math");
    const sub = matchSubject(extra.subject, await getSubjects());
    if (sub) form.set("subject_id", sub.id);
  }
  const result = await saveEvent({ status: "idle" }, form);
  if (result.status !== "saved") return result;
  revalidatePath("/app", "layout");
  const d = fromISODate(date);
  const wd = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()];
  const when = `${wd} ${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}${time ? ` às ${time}` : ""}`;
  const parts = [`Na agenda: ${title} — ${when}.`];
  if (extra.repeat && until) {
    const u = fromISODate(until);
    parts.push(`Repete ${REPEAT_LABEL[extra.repeat]} até ${String(u.day).padStart(2, "0")}/${String(u.month).padStart(2, "0")}.`);
  }
  const remind = Number(form.get("remind_days") ?? 0);
  parts.push(remind ? `Aviso ${remind} dias antes${time ? " e 3 horas antes" : ""}.` : time ? "Aviso na véspera, no dia e 3 horas antes." : "Aviso na véspera e no dia.");
  if (form.get("study_sessions")) parts.push(result.message ?? "");
  return { status: "saved", message: parts.filter(Boolean).join(" ") };
}

// Frases de Estudos: nota, falta, horário de aula e plano de estudo para prova já marcada.
async function studyFromText(
  ai:
    | { intent: "grade"; subject: string; value: number; label: string | null }
    | { intent: "absence"; subject: string; count: number }
    | { intent: "class"; subject: string; weekday: number; time: string; endTime: string | null }
    | { intent: "study_plan"; subject: string; sessions: number },
): Promise<FormState> {
  const { getSubjects } = await import("@/lib/studies");
  const { matchSubject, WEEKDAYS } = await import("@/lib/studies-math");
  const subjects = await getSubjects();
  let sub = matchSubject(ai.subject, subjects);
  const supabase = await db();

  if (!sub && ai.intent === "class") {
    // Aula de matéria que ainda não existe: cria a matéria com o padrão (média 6 de 10).
    const name = ai.subject.charAt(0).toUpperCase() + ai.subject.slice(1);
    const { data } = await supabase
      .from("subjects")
      .insert({ user_id: OWNER_ID, name: name.slice(0, 60), pass_grade: 6, max_grade: 10 })
      .select("id, name")
      .single();
    if (data) sub = { id: data.id, name: data.name, pass: 6, max: 10, maxAbsences: null, absences: 0 };
  }
  if (!sub) return fail(`Não achei a matéria “${ai.subject}”. Crie ela em Estudos e tente de novo.`);

  if (ai.intent === "absence") {
    const { data: bumped } = await supabase.rpc("bump_absences", { p_id: sub.id, p_delta: ai.count });
    const next = typeof bumped === "number" ? bumped : Math.min(500, sub.absences + ai.count);
    revalidatePath("/app", "layout");
    const limit = sub.maxAbsences === null ? "" : ` de ${sub.maxAbsences}`;
    const warn =
      sub.maxAbsences !== null && sub.maxAbsences - next <= 2
        ? next > sub.maxAbsences
          ? " Passou do limite!"
          : next === sub.maxAbsences
            ? " No limite: não pode faltar mais."
            : " Perto do limite."
        : "";
    return { status: "saved", message: `Falta em ${sub.name}: ${next}${limit}.${warn}` };
  }

  if (ai.intent === "grade") {
    const { data: pending } = await supabase
      .from("grades")
      .select("id, label")
      .eq("subject_id", sub.id)
      .eq("user_id", OWNER_ID)
      .is("value", null)
      .order("created_at");
    const fold = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const target = ai.label
      ? (pending ?? []).find((g) => fold(g.label).includes(fold(ai.label!)) || fold(ai.label!).includes(fold(g.label)))
      : (pending ?? [])[0];
    const { error } = target
      ? await supabase.from("grades").update({ value: ai.value }).eq("id", target.id).eq("user_id", OWNER_ID)
      : await supabase
          .from("grades")
          .insert({ user_id: OWNER_ID, subject_id: sub.id, label: (ai.label ?? "Nota").slice(0, 60), weight: 1, value: ai.value });
    if (error) return fail("Não foi possível salvar a nota.");
    revalidatePath("/app", "layout");
    const shown = ai.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    return { status: "saved", message: `Nota ${shown} em ${sub.name}${target ? ` (${target.label})` : ai.label ? ` (${ai.label})` : ""}.` };
  }

  if (ai.intent === "class") {
    const { error } = await supabase.from("class_slots").insert({
      user_id: OWNER_ID,
      subject_id: sub.id,
      weekday: ai.weekday,
      starts_at: ai.time,
      ends_at: ai.endTime,
    });
    if (error) return fail("Não foi possível salvar a aula.");
    revalidatePath("/app", "layout");
    return {
      status: "saved",
      message: `Aula de ${sub.name} toda ${WEEKDAYS[ai.weekday].toLowerCase()} às ${ai.time}${ai.endTime ? ` até ${ai.endTime}` : ""}. Aparece na Agenda.`,
    };
  }

  // Plano de estudo: espalha sessões até a próxima prova dessa matéria.
  const { data: exams } = await supabase
    .from("events")
    .select("id, title, starts_at, subject_id")
    .eq("user_id", OWNER_ID)
    .eq("kind", "exam")
    .is("done_at", null)
    .gte("starts_at", `${todayISO()}T00:00:00-03:00`)
    .order("starts_at");
  const fold = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const exam =
    (exams ?? []).find((e) => e.subject_id === sub!.id) ??
    (exams ?? []).find((e) => fold(e.title).includes(fold(sub!.name)) || fold(e.title).includes(fold(ai.subject)));
  if (!exam) return fail(`Não achei prova de ${sub.name} marcada. Diga junto a data, ex.: prova de ${ai.subject} sexta, quero estudar ${ai.sessions} vezes.`);
  const examDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(exam.starts_at));
  const days = await pickStudyDays(supabase, examDate, ai.sessions);
  if (!days.length) return fail("Não sobrou dia livre antes dessa prova.");
  const study = new FormData();
  study.set("kind", "study");
  const { typeId } = await resolveType(supabase, study);
  const { error } = await supabase.from("events").insert(
    days.map((d) => ({
      user_id: OWNER_ID,
      title: `Estudar: ${exam.title}`.slice(0, 80),
      kind: "study",
      type_id: typeId,
      subject_id: sub!.id,
      starts_at: `${d}T12:00:00-03:00`,
      all_day: true,
      remind_days: 0,
    })),
  );
  if (error) return fail("Não foi possível criar as sessões.");
  revalidatePath("/app", "layout");
  return { status: "saved", message: `${days.length} ${days.length === 1 ? "sessão" : "sessões"} de estudo para ${exam.title} na agenda.` };
}
