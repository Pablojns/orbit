// Orçamento por categoria no ciclo (Rodada 8): avisos em 75%, 90% e 100%.
export type BudgetLevel = "ok" | "75" | "90" | "100";

export function budgetLevel(spentCents: number, budgetCents: number | null | undefined): BudgetLevel {
  if (!budgetCents || budgetCents <= 0) return "ok";
  const pct = spentCents / budgetCents;
  if (pct >= 1) return "100";
  if (pct >= 0.9) return "90";
  if (pct >= 0.75) return "75";
  return "ok";
}

export const BUDGET_LABEL: Record<BudgetLevel, string> = {
  ok: "",
  "75": "75% do orçamento",
  "90": "90% do orçamento",
  "100": "orçamento estourado",
};
