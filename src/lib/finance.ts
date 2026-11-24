import "server-only";
import { createClient } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { cycleAt, type Cycle } from "@/lib/cycle";
import { addDays, type CalendarDate, diffInDays, fromISODate, todayInSaoPaulo, toISODate } from "@/lib/dates";
import {
  addMonths,
  firstOfMonthISO,
  inRange,
  monthlyOccurrences,
  parcelInCycle,
  statementClosingDate,
  statementDueDate,
} from "@/lib/schedule";

// ---------- tipos ----------------------------------------------------

export type Category = {
  id: string;
  name: string;
  kind: "expense" | "income";
  icon: string | null;
  budgetCents: number | null;
};
export type Card = {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  limitCents: number | null;
  color: string | null;
};
export type CategoryRef = { name: string; icon: string | null } | null;

export type Movement = {
  id: string;
  source: "transaction" | "card_purchase" | "bill_payment";
  type: "expense" | "income";
  amountCents: number;
  occurredOn: string;
  description: string | null;
  paymentMethod: string | null;
  category: CategoryRef;
  categoryId: string | null;
  cardId?: string;
  cardName?: string;
  installments?: number;
  installmentNumber?: number; // compra no cartão: qual parcela é deste ciclo
  totalCents?: number; // compra no cartão: valor total da compra
  purchasedOn?: string; // compra no cartão: data da compra
  billId?: string; // conta fixa paga
  referenceMonth?: string; // conta fixa paga: mês da conta (AAAA-MM-01)
};

export type Statement = {
  cardId: string;
  cardName: string;
  month: string; // AAAA-MM-01 (mês de vencimento)
  closingDate: CalendarDate;
  dueDate: CalendarDate;
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  status: "open" | "closed" | "paid" | "future"; // future: fecha depois da fatura aberta
  items: { description: string; amountCents: number; number: number; count: number; purchasedOn: string }[];
};

export type BillOccurrence = {
  billId: string;
  name: string;
  amountCents: number;
  dueDate: CalendarDate;
  referenceMonth: string;
  paid: boolean;
  category: CategoryRef;
};

export type IncomeOccurrence = {
  incomeId: string;
  name: string;
  amountCents: number;
  date: CalendarDate;
  received: boolean;
};

export type Goal = {
  id: string;
  name: string;
  kind: "emergency" | "custom";
  targetCents: number;
  savedCents: number;
  targetDate: string | null;
};

export type Bill = {
  id: string;
  name: string;
  amountCents: number;
  isSubscription: boolean;
  paymentCode: string | null;
  dueDay: number;
  endsOn: string | null;
  category: CategoryRef;
  categoryId: string | null;
};

export type RecurringIncome = {
  id: string;
  name: string;
  amountCents: number;
  dayOfMonth: number;
  endsOn: string | null;
};

export type Finance = {
  today: CalendarDate;
  cycle: Cycle;
  categories: Category[];
  cards: Card[];
  bills: Bill[];
  incomes: RecurringIncome[];
  goals: Goal[];
  movements: Movement[];
  statements: Statement[]; // vencendo neste ciclo e a fatura aberta de cada cartão
  billsInCycle: BillOccurrence[];
  incomesInCycle: IncomeOccurrence[];
  summary: {
    receivedCents: number;
    spentCents: number; // saiu: gastos diretos + faturas pagas + contas pagas
    savedCents: number; // guardado em metas no ciclo
    committedCents: number; // faturas e contas ainda a pagar no ciclo
    freeCents: number;
    perDayCents: number;
    toReceiveCents: number;
    balanceCents: number; // Saldo: tudo que entrou − saiu fora do cartão − faturas pagas − guardado em metas, desde o começo
    upcomingCents: number; // contas fixas e faturas que ainda vencem neste ciclo
    hasAnyIncome: boolean; // já lançou alguma entrada desde o começo (primeiro acesso)
    openStatementCents: number; // soma das faturas abertas (ainda não fechadas) de todos os cartões
    byCategory: { name: string; icon: string | null; cents: number }[];
    week: { thisWeekCents: number; lastWeekCents: number };
  };
};

const one = <T>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

// ---------- leitura -------------------------------------------------

// Saldo desde o primeiro uso, até a data `untilISO` (fim do ciclo mostrado):
// entradas − gastos fora do cartão − contas pagas − faturas pagas − guardado em metas.
async function getBalanceParts(supabase: Awaited<ReturnType<typeof createClient>>, untilISO: string) {
  const [tx, bills, cards, goals] = await Promise.all([
    supabase.from("transactions").select("type, amount_cents").eq("user_id", OWNER_ID).lte("occurred_on", untilISO),
    supabase.from("bill_payments").select("amount_cents").eq("user_id", OWNER_ID).lte("paid_on", untilISO),
    supabase.from("card_statement_payments").select("amount_cents").eq("user_id", OWNER_ID).lte("paid_on", untilISO),
    supabase.from("goal_contributions").select("amount_cents").eq("user_id", OWNER_ID).lte("contributed_on", untilISO),
  ]);
  const sum = (rows: { amount_cents: unknown }[] | null) => (rows ?? []).reduce((a, r) => a + Number(r.amount_cents), 0);
  const income = sum((tx.data ?? []).filter((t) => t.type === "income"));
  const expense = sum((tx.data ?? []).filter((t) => t.type === "expense"));
  return {
    balance: income - expense - sum(bills.data) - sum(cards.data) - sum(goals.data),
    hasIncome: (tx.data ?? []).some((t) => t.type === "income"),
  };
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, kind, icon, budget_cents")
    .eq("user_id", OWNER_ID)
    .eq("is_archived", false)
    .order("name");
  return (data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    kind: c.kind as Category["kind"],
    icon: (c.icon as string | null) ?? null,
    budgetCents: c.budget_cents === null || c.budget_cents === undefined ? null : Number(c.budget_cents),
  }));
}

export async function getCards(): Promise<Card[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("credit_cards")
    .select("id, name, closing_day, due_day, limit_cents, color")
    .eq("user_id", OWNER_ID)
    .eq("is_archived", false)
    .order("created_at");
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    closingDay: c.closing_day,
    dueDay: c.due_day,
    limitCents: c.limit_cents === null ? null : Number(c.limit_cents),
    color: c.color,
  }));
}

export async function getFinance(cycleStartDay: number, offset = 0): Promise<Finance> {
  const safeOffset = Math.max(-24, Math.min(0, Math.trunc(offset) || 0));
  const now = todayInSaoPaulo();
  const cycle = cycleAt(now, cycleStartDay, safeOffset);
  // Em ciclo passado, "hoje" é o último dia dele (para status de faturas e contas).
  const today = safeOffset < 0 ? cycle.end : now;
  const startISO = toISODate(cycle.start);
  const endISO = toISODate(cycle.end);
  const weekStartISO = toISODate(addDays(today, -13));
  const fromISO = startISO < weekStartISO ? startISO : weekStartISO;

  // Faturas: do mês do início do ciclo em diante, com TODAS as parcelas futuras
  // (o limite e "Próximas faturas" precisam de todas, não só 2 meses).
  const firstMonth = firstOfMonthISO(cycle.start.year, cycle.start.month);
  // Compras de até 48 meses atrás ainda podem ter parcela neste ciclo.
  const pm = addMonths(cycle.start.year, cycle.start.month, -48);
  const purchasesFromISO = firstOfMonthISO(pm.year, pm.month);

  const supabase = await createClient();
  const [cats, cards, tx, purchases, inst, payments, bills, billPays, incomes, goals, contribs] = await Promise.all([
    getCategories(),
    getCards(),
    supabase
      .from("transactions")
      .select(
        "id, type, amount_cents, occurred_on, description, payment_method, recurring_income_id, category_id, category:categories(name, icon)",
      )
      .eq("user_id", OWNER_ID)
      .gte("occurred_on", fromISO)
      .lte("occurred_on", endISO)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("card_purchases")
      .select(
        "id, card_id, description, total_cents, installments_count, purchased_on, category_id, category:categories(name, icon)",
      )
      .eq("user_id", OWNER_ID)
      .gte("purchased_on", purchasesFromISO)
      .lte("purchased_on", endISO)
      .order("purchased_on", { ascending: false }),
    supabase
      .from("installments")
      .select(
        "card_id, number, amount_cents, statement_month, purchase:card_purchases(description, installments_count, purchased_on)",
      )
      .eq("user_id", OWNER_ID)
      .gte("statement_month", firstMonth),
    supabase
      .from("card_statement_payments")
      .select("card_id, statement_month, amount_cents, paid_on")
      .eq("user_id", OWNER_ID)
      .gte("statement_month", firstMonth),
    supabase
      .from("bills")
      .select(
        "id, name, amount_cents, due_day, starts_on, ends_on, is_active, category_id, is_subscription, payment_code, category:categories(name, icon)",
      )
      .eq("user_id", OWNER_ID)
      .eq("is_active", true)
      .order("due_day"),
    supabase
      .from("bill_payments")
      .select("bill_id, reference_month, amount_cents, paid_on")
      .eq("user_id", OWNER_ID)
      .gte("paid_on", toISODate(addDays(cycle.start, -40))),
    supabase
      .from("recurring_incomes")
      .select("id, name, amount_cents, day_of_month, starts_on, ends_on, is_active")
      .eq("user_id", OWNER_ID)
      .eq("is_active", true)
      .order("day_of_month"),
    supabase
      .from("goals")
      .select("id, name, kind, target_cents, target_date")
      .eq("user_id", OWNER_ID)
      .eq("is_archived", false)
      .order("created_at"),
    supabase.from("goal_contributions").select("goal_id, amount_cents, contributed_on").eq("user_id", OWNER_ID),
  ]);
  const balance = await getBalanceParts(supabase, endISO);

  const cardById = new Map(cards.map((c) => [c.id, c]));

  // Movimentações (só do ciclo para a lista; semana usa o intervalo maior)
  const allTx = (tx.data ?? []).map((r) => ({
    id: r.id as string,
    source: "transaction" as const,
    type: r.type as "expense" | "income",
    amountCents: Number(r.amount_cents),
    occurredOn: r.occurred_on as string,
    description: r.description as string | null,
    paymentMethod: r.payment_method as string | null,
    recurringIncomeId: r.recurring_income_id as string | null,
    category: one(r.category) as CategoryRef,
    categoryId: (r.category_id as string | null) ?? null,
  }));
  const purchaseRows = purchases.data ?? [];
  const toPurchaseMovement = (
    p: (typeof purchaseRows)[number],
    parcel: { number: number; amountCents: number; date: string },
  ): Movement => ({
    id: p.id,
    source: "card_purchase",
    type: "expense",
    amountCents: parcel.amountCents,
    occurredOn: parcel.date,
    description: p.description,
    paymentMethod: "credit",
    category: one(p.category) as CategoryRef,
    categoryId: p.category_id ?? null,
    cardId: p.card_id,
    cardName: cardById.get(p.card_id)?.name ?? "Cartão",
    installments: p.installments_count,
    installmentNumber: parcel.number,
    totalCents: Number(p.total_cents),
    purchasedOn: p.purchased_on as string,
  });
  // Só a parcela que cai neste ciclo (a 1ª na data da compra, a 2ª um mês depois…).
  const cyclePurchases: Movement[] = purchaseRows.flatMap((p) => {
    const parcel = parcelInCycle(p.purchased_on, Number(p.total_cents), p.installments_count, cycle.start, cycle.end);
    return parcel ? [toPurchaseMovement(p, parcel)] : [];
  });
  // Para a comparação das semanas: a compra no dia em que foi feita.
  const allPurchases = purchaseRows
    .filter((p) => p.purchased_on >= fromISO)
    .map((p) => ({ occurredOn: p.purchased_on as string, amountCents: Number(p.total_cents) }));

  const movementsBase: Movement[] = [...allTx.filter((m) => inRange(m.occurredOn, cycle.start, cycle.end)), ...cyclePurchases];

  // Faturas
  const statementMap = new Map<string, Statement>();
  for (const row of inst.data ?? []) {
    const card = cardById.get(row.card_id);
    if (!card) continue;
    const key = `${row.card_id}|${row.statement_month}`;
    let st = statementMap.get(key);
    if (!st) {
      st = {
        cardId: card.id,
        cardName: card.name,
        month: row.statement_month,
        closingDate: statementClosingDate(row.statement_month, card.closingDay, card.dueDay),
        dueDate: statementDueDate(row.statement_month, card.dueDay),
        totalCents: 0,
        paidCents: 0,
        remainingCents: 0,
        status: "open",
        items: [],
      };
      statementMap.set(key, st);
    }
    const purchase = one(row.purchase) as {
      description: string;
      installments_count: number;
      purchased_on: string;
    } | null;
    st.totalCents += Number(row.amount_cents);
    st.items.push({
      description: purchase?.description ?? "Compra",
      amountCents: Number(row.amount_cents),
      number: row.number,
      count: purchase?.installments_count ?? 1,
      purchasedOn: purchase?.purchased_on ?? "",
    });
  }
  let cardPaidInCycle = 0;
  for (const p of payments.data ?? []) {
    const st = statementMap.get(`${p.card_id}|${p.statement_month}`);
    if (st) st.paidCents += Number(p.amount_cents);
    if (inRange(p.paid_on, cycle.start, cycle.end)) cardPaidInCycle += Number(p.amount_cents);
  }
  const allStatements = [...statementMap.values()]
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .map((st) => {
      const remaining = Math.max(0, st.totalCents - st.paidCents);
      const closed = diffInDays(st.closingDate, today) >= 0;
      return {
        ...st,
        remainingCents: remaining,
        status: (remaining === 0 ? "paid" : closed ? "closed" : "open") as Statement["status"],
      };
    });
  // Só a primeira fatura ainda não fechada de cada cartão é a "aberta"; as seguintes são futuras.
  const seenOpen = new Set<string>();
  for (const st of allStatements) {
    if (st.status !== "open") continue;
    if (seenOpen.has(st.cardId)) st.status = "future";
    else seenOpen.add(st.cardId);
  }
  const statements = allStatements
    .filter(
      (st) => inRange(toISODate(st.dueDate), cycle.start, cycle.end) || st.status === "open" || st.status === "future",
    )
    .sort((a, b) => diffInDays(b.dueDate, a.dueDate));

  // Contas fixas no ciclo
  const billRows = (bills.data ?? []).map((b) => ({
    id: b.id as string,
    name: b.name as string,
    amountCents: Number(b.amount_cents),
    isSubscription: Boolean(b.is_subscription),
    paymentCode: (b.payment_code as string | null) ?? null,
    dueDay: b.due_day as number,
    startsOn: b.starts_on as string,
    endsOn: b.ends_on as string | null,
    category: one(b.category) as CategoryRef,
    categoryId: (b.category_id as string | null) ?? null,
  }));
  // Contas pagas entram no Extrato, na data em que tocaram em "Paguei".
  const billPayMovements: Movement[] = (billPays.data ?? [])
    .filter((p) => inRange(p.paid_on, cycle.start, cycle.end))
    .flatMap((p) => {
      const bill = billRows.find((b) => b.id === p.bill_id);
      if (!bill) return [];
      return [
        {
          id: `${p.bill_id}|${p.reference_month}`,
          source: "bill_payment" as const,
          type: "expense" as const,
          amountCents: Number(p.amount_cents),
          occurredOn: p.paid_on as string,
          description: bill.name,
          paymentMethod: null,
          category: bill.category ?? { name: "Contas", icon: "receipt" },
          categoryId: bill.categoryId,
          billId: bill.id,
          referenceMonth: p.reference_month as string,
        },
      ];
    });
  const movements: Movement[] = [...movementsBase, ...billPayMovements].sort((a, b) =>
    a.occurredOn < b.occurredOn ? 1 : a.occurredOn > b.occurredOn ? -1 : 0,
  );
  const paidKeys = new Set((billPays.data ?? []).map((p) => `${p.bill_id}|${p.reference_month}`));
  let billsPaidInCycle = 0;
  for (const p of billPays.data ?? []) {
    if (inRange(p.paid_on, cycle.start, cycle.end)) billsPaidInCycle += Number(p.amount_cents);
  }
  const billsInCycle: BillOccurrence[] = billRows
    .flatMap((b) =>
      monthlyOccurrences(b.dueDay, cycle.start, cycle.end, b.startsOn, b.endsOn).map((date) => {
        const referenceMonth = firstOfMonthISO(date.year, date.month);
        return {
          billId: b.id,
          name: b.name,
          amountCents: b.amountCents,
          dueDate: date,
          referenceMonth,
          paid: paidKeys.has(`${b.id}|${referenceMonth}`),
          category: b.category,
        };
      }),
    )
    .sort((a, b) => diffInDays(b.dueDate, a.dueDate));

  // Entradas fixas no ciclo
  const incomeRows = (incomes.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    amountCents: Number(r.amount_cents),
    dayOfMonth: r.day_of_month as number,
    startsOn: r.starts_on as string,
    endsOn: r.ends_on as string | null,
  }));
  const receivedIds = new Set(
    allTx
      .filter((t) => t.recurringIncomeId && inRange(t.occurredOn, cycle.start, cycle.end))
      .map((t) => t.recurringIncomeId),
  );
  const incomesInCycle: IncomeOccurrence[] = incomeRows.flatMap((r) =>
    monthlyOccurrences(r.dayOfMonth, cycle.start, cycle.end, r.startsOn, r.endsOn).map((date) => ({
      incomeId: r.id,
      name: r.name,
      amountCents: r.amountCents,
      date,
      received: receivedIds.has(r.id),
    })),
  );

  // Metas
  const savedByGoal = new Map<string, number>();
  let savedInCycle = 0;
  for (const c of contribs.data ?? []) {
    savedByGoal.set(c.goal_id, (savedByGoal.get(c.goal_id) ?? 0) + Number(c.amount_cents));
    if (inRange(c.contributed_on, cycle.start, cycle.end)) savedInCycle += Number(c.amount_cents);
  }
  const goalList: Goal[] = (goals.data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    kind: g.kind,
    targetCents: Number(g.target_cents),
    savedCents: savedByGoal.get(g.id) ?? 0,
    targetDate: g.target_date,
  }));

  // Resumo
  const cycleTx = allTx.filter((t) => inRange(t.occurredOn, cycle.start, cycle.end));
  const receivedCents = cycleTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amountCents, 0);
  const directSpent = cycleTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amountCents, 0);
  const spentCents = directSpent + cardPaidInCycle + billsPaidInCycle;
  const committedCards = allStatements
    .filter((st) => inRange(toISODate(st.dueDate), cycle.start, cycle.end))
    .reduce((s, st) => s + st.remainingCents, 0);
  const committedBills = billsInCycle.filter((b) => !b.paid).reduce((s, b) => s + b.amountCents, 0);
  const committedCents = committedCards + committedBills;
  const freeCents = receivedCents - spentCents - savedInCycle - committedCents;
  const perDayCents = freeCents > 0 ? Math.floor(freeCents / (cycle.daysLeft + 1)) : 0;
  const toReceiveCents = incomesInCycle.filter((i) => !i.received).reduce((s, i) => s + i.amountCents, 0);

  const catTotals = new Map<string, { name: string; icon: string | null; cents: number }>();
  const addCat = (ref: CategoryRef, cents: number) => {
    const name = ref?.name ?? "Sem categoria";
    const cur = catTotals.get(name) ?? { name, icon: ref?.icon ?? null, cents: 0 };
    cur.cents += cents;
    catTotals.set(name, cur);
  };
  movements.filter((m) => m.type === "expense").forEach((m) => addCat(m.category, m.amountCents));

  const weekStart = toISODate(addDays(today, -6));
  const lastWeekStart = toISODate(addDays(today, -13));
  const todayISO = toISODate(today);
  const spending = [
    ...allTx.filter((t) => t.type === "expense").map((t) => ({ on: t.occurredOn, cents: t.amountCents })),
    ...allPurchases.map((p) => ({ on: p.occurredOn, cents: p.amountCents })),
  ];
  const thisWeekCents = spending.filter((s) => s.on >= weekStart && s.on <= todayISO).reduce((a, s) => a + s.cents, 0);
  const lastWeekCents = spending
    .filter((s) => s.on >= lastWeekStart && s.on < weekStart)
    .reduce((a, s) => a + s.cents, 0);

  return {
    today,
    cycle,
    categories: cats,
    cards,
    bills: billRows.map((b) => ({
      id: b.id,
      name: b.name,
      amountCents: b.amountCents,
      isSubscription: b.isSubscription,
      paymentCode: b.paymentCode,
      dueDay: b.dueDay,
      endsOn: b.endsOn,
      category: b.category,
      categoryId: b.categoryId,
    })),
    incomes: incomeRows.map(({ id, name, amountCents, dayOfMonth, endsOn }) => ({
      id,
      name,
      amountCents,
      dayOfMonth,
      endsOn,
    })),
    goals: goalList,
    movements,
    statements,
    billsInCycle,
    incomesInCycle,
    summary: {
      receivedCents,
      spentCents,
      savedCents: savedInCycle,
      committedCents,
      freeCents,
      perDayCents,
      toReceiveCents,
      // Saldo já desconta o que ainda vai vencer neste ciclo (contas fixas e faturas não pagas).
      balanceCents: balance.balance - committedCents,
      upcomingCents: committedCents,
      hasAnyIncome: balance.hasIncome,
      openStatementCents: allStatements.filter((st) => st.status === "open").reduce((a, st) => a + st.remainingCents, 0),
      byCategory: [...catTotals.values()].sort((a, b) => b.cents - a.cents),
      week: { thisWeekCents, lastWeekCents },
    },
  };
}

export function daysUntil(date: CalendarDate, today: CalendarDate) {
  return diffInDays(today, date);
}

export { fromISODate };
