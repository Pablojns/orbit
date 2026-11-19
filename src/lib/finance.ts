import "server-only";
import { createClient } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { currentCycle, type Cycle } from "@/lib/cycle";
import { todayInSaoPaulo, toISODate, type CalendarDate } from "@/lib/dates";

export type Category = { id: string; name: string; kind: "expense" | "income"; icon: string | null };

export type Movement = {
  id: string;
  type: "expense" | "income";
  amountCents: number;
  occurredOn: string;
  description: string | null;
  paymentMethod: string | null;
  category: { name: string; icon: string | null } | null;
};

export type CycleSummary = {
  today: CalendarDate;
  cycle: Cycle;
  incomeCents: number;
  expenseCents: number;
  freeCents: number;
  perDayCents: number; // quanto dá para gastar por dia até o fim do ciclo
  byCategory: { name: string; icon: string | null; cents: number }[];
  movements: Movement[];
};

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, kind, icon")
    .eq("user_id", OWNER_ID)
    .eq("is_archived", false)
    .order("name");
  return (data ?? []) as Category[];
}

export async function getCycleSummary(cycleStartDay: number): Promise<CycleSummary> {
  const today = todayInSaoPaulo();
  const cycle = currentCycle(today, cycleStartDay);
  const supabase = await createClient();

  const { data } = await supabase
    .from("transactions")
    .select("id, type, amount_cents, occurred_on, description, payment_method, category:categories(name, icon)")
    .eq("user_id", OWNER_ID)
    .gte("occurred_on", toISODate(cycle.start))
    .lte("occurred_on", toISODate(cycle.end))
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  const movements: Movement[] = (data ?? []).map((row) => {
    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    return {
      id: row.id,
      type: row.type,
      amountCents: Number(row.amount_cents),
      occurredOn: row.occurred_on,
      description: row.description,
      paymentMethod: row.payment_method,
      category: category ?? null,
    };
  });

  let incomeCents = 0;
  let expenseCents = 0;
  const categoryTotals = new Map<string, { name: string; icon: string | null; cents: number }>();

  for (const m of movements) {
    if (m.type === "income") {
      incomeCents += m.amountCents;
    } else {
      expenseCents += m.amountCents;
      const key = m.category?.name ?? "Sem categoria";
      const current = categoryTotals.get(key) ?? { name: key, icon: m.category?.icon ?? null, cents: 0 };
      current.cents += m.amountCents;
      categoryTotals.set(key, current);
    }
  }

  const freeCents = incomeCents - expenseCents;
  const daysIncludingToday = cycle.daysLeft + 1;
  const perDayCents = freeCents > 0 ? Math.floor(freeCents / daysIncludingToday) : 0;

  return {
    today,
    cycle,
    incomeCents,
    expenseCents,
    freeCents,
    perDayCents,
    byCategory: [...categoryTotals.values()].sort((a, b) => b.cents - a.cents),
    movements,
  };
}
