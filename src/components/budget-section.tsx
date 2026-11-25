import { saveBudgets } from "@/app/app/actions";
import { FormSheet } from "@/components/form-sheet";
import { MoneyInput } from "@/components/fields";
import { BUDGET_LABEL, budgetLevel } from "@/lib/budget";
import type { Finance } from "@/lib/finance";
import { formatCents } from "@/lib/money";

// Limites por categoria (antes "Orçamento do ciclo", no Extrato). Avisa em 75%, 90% e 100%.
export function BudgetSection({ f }: { f: Finance }) {
  const expenseCats = f.categories.filter((c) => c.kind === "expense");
  const spentBy = new Map(f.summary.byCategory.map((c) => [c.name, c.cents]));
  const budgeted = expenseCats
    .filter((c) => c.budgetCents)
    .map((c) => {
      const spent = spentBy.get(c.name) ?? 0;
      return {
        id: c.id,
        name: c.name,
        spent,
        budget: c.budgetCents!,
        level: budgetLevel(spent, c.budgetCents),
      };
    });
  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg">Limites por categoria</h2>
        <FormSheet
          title="Limites por categoria"
          trigger={budgeted.length ? "Mudar" : "Definir"}
          submitLabel="Salvar limites"
          action={saveBudgets}
          triggerClassName="h-11 shrink-0 rounded-xl border border-white/[0.14] px-4 text-sm font-bold hover:bg-white/[0.05]"
        >
          <p className="text-sm text-ink-soft">
            Quanto quer gastar em cada categoria até o salário. Deixe vazio para
            não ter limite.
          </p>
          {expenseCats.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_9rem] items-center gap-3"
            >
              <input type="hidden" name="cat_id" value={c.id} />
              <span className="text-[15px] font-semibold">{c.name}</span>
              <MoneyInput
                name={`budget_${c.id}`}
                aria-label={`Limite de ${c.name}`}
                defaultValue={
                  c.budgetCents
                    ? (c.budgetCents / 100).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })
                    : ""
                }
              />
            </div>
          ))}
        </FormSheet>
      </div>
      {budgeted.length ? (
        <ul className="mt-3 space-y-3">
          {budgeted.map((b) => (
            <li key={b.id}>
              <div className="flex items-center justify-between gap-3 text-[15px]">
                <span className="font-semibold">{b.name}</span>
                <span
                  className={
                    b.level === "100"
                      ? "font-bold text-loss"
                      : b.level !== "ok"
                        ? "font-bold text-[#c4b5fd]"
                        : "text-ink-soft"
                  }
                >
                  {formatCents(b.spent)} de {formatCents(b.budget)}
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-white/10" aria-hidden>
                <div
                  className={`h-2 rounded-full ${b.level === "100" ? "bg-loss" : b.level === "ok" ? "bg-[#4361f5]" : "bg-[#a78bfa]"}`}
                  style={{
                    width: `${Math.min(100, (b.spent / b.budget) * 100)}%`,
                  }}
                />
              </div>
              {b.level !== "ok" ? (
                <p className="mt-1 text-[13px] font-semibold text-[#c4b5fd]">
                  {BUDGET_LABEL[b.level]}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[15px] text-ink-soft">
          Nenhum limite definido. Você recebe um aviso em 75%, 90% e 100%.
        </p>
      )}
    </section>
  );
}
