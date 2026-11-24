import "server-only";
import { createClient } from "@/lib/supabase/server";
import { uid } from "@/lib/user";

export type Debt = {
  id: string;
  person: string;
  direction: "owed_to_me" | "i_owe";
  amountCents: number;
  note: string | null;
  occurredOn: string;
  settled: boolean;
};

export async function getDebts(): Promise<Debt[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("debts")
    .select("id, person, direction, amount_cents, note, occurred_on, settled_at")
    .eq("user_id", (await uid()))
    .order("settled_at", { ascending: true, nullsFirst: true })
    .order("occurred_on", { ascending: false })
    .limit(200);
  return (data ?? []).map((d) => ({
    id: d.id,
    person: d.person,
    direction: d.direction,
    amountCents: Number(d.amount_cents),
    note: d.note,
    occurredOn: d.occurred_on,
    settled: Boolean(d.settled_at),
  }));
}
