import { centsToCsv, toCsv } from "@/lib/csv";
import { uid } from "@/lib/user";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Exporta os dados da pessoa em CSV: lançamentos, compras no cartão, contas pagas,
// metas, agenda e hábitos marcados.
export async function GET() {
  const supabase = await createClient();
  const [tx, cp, bp, gc, ev, hc] = await Promise.all([
    supabase.from("transactions").select("occurred_on, type, amount_cents, description, payment_method, category:categories(name)").eq("user_id", (await uid())).order("occurred_on"),
    supabase.from("card_purchases").select("purchased_on, total_cents, installments_count, description, card:credit_cards(name), category:categories(name)").eq("user_id", (await uid())).order("purchased_on"),
    supabase.from("bill_payments").select("paid_on, amount_cents, reference_month, bill:bills(name)").eq("user_id", (await uid())).order("paid_on"),
    supabase.from("goal_contributions").select("contributed_on, amount_cents, goal:goals(name)").eq("user_id", (await uid())).order("contributed_on"),
    supabase.from("events").select("starts_at, title, kind, notes, done_at").eq("user_id", (await uid())).order("starts_at"),
    supabase.from("habit_checks").select("checked_on, habit:habits(name)").eq("user_id", (await uid())).order("checked_on"),
  ]);
  type Named = { name?: string } | { name?: string }[] | null;
  const nm = (x: unknown) => {
    const v = x as Named;
    return (Array.isArray(v) ? v[0]?.name : v?.name) ?? "";
  };
  const rows: (string | number | null)[][] = [["origem", "data", "tipo", "descrição", "valor (R$)", "detalhe"]];
  for (const t of tx.data ?? [])
    rows.push(["lançamento", t.occurred_on, t.type === "income" ? "entrada" : "gasto", t.description, centsToCsv(Number(t.amount_cents)), [nm(t.category), t.payment_method].filter(Boolean).join(" · ")]);
  for (const p of cp.data ?? [])
    rows.push(["cartão", p.purchased_on, "gasto", p.description, centsToCsv(Number(p.total_cents)), `${nm(p.card)} · ${p.installments_count}x · ${nm(p.category)}`]);
  for (const b of bp.data ?? [])
    rows.push(["conta fixa paga", b.paid_on, "gasto", nm(b.bill), centsToCsv(Number(b.amount_cents)), `mês ${String(b.reference_month).slice(0, 7)}`]);
  for (const g of gc.data ?? [])
    rows.push(["meta", g.contributed_on, Number(g.amount_cents) >= 0 ? "guardado" : "retirado", nm(g.goal), centsToCsv(Number(g.amount_cents)), ""]);
  for (const e of ev.data ?? [])
    rows.push(["agenda", String(e.starts_at).slice(0, 16).replace("T", " "), e.kind, e.title, "", [e.done_at ? "feito" : "", e.notes].filter(Boolean).join(" · ")]);
  for (const h of hc.data ?? []) rows.push(["hábito", h.checked_on, "marcado", nm(h.habit), "", ""]);

  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return new Response(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="dimeta-dados-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
}
