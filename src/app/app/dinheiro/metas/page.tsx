import { PiggyBank, Target } from "lucide-react";
import { DeleteButton } from "@/components/undo";
import { EditGoal } from "@/components/edit-forms";
import { EmptyState } from "@/components/empty-state";
import { Field, MoneyInput, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import { archiveGoal, contributeGoal, saveGoal } from "@/app/app/actions";
import { diffInDays, fromISODate, toISODate } from "@/lib/dates";
import { GoalFields } from "@/components/goal-fields";
import { getFinance } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { requireProfile } from "@/lib/profile";

export const metadata = { title: "Metas" };
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const profile = await requireProfile();
  const [f, prev] = await Promise.all([getFinance(profile.cycleStartDay), getFinance(profile.cycleStartDay, -1)]);
  // Gasto de um mês para a dica da reserva: o ciclo passado; sem histórico, o atual (o que já saiu + o que vence).
  const monthlyCents = prev.summary.spentCents || f.summary.spentCents + f.summary.committedCents;
  const hasEmergency = f.goals.some((g) => g.kind === "emergency");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] text-ink-soft">O que você guarda aqui sai do seu livre para gastar.</p>
        <FormSheet title="Nova meta" trigger="Meta" submitLabel="Criar meta" action={saveGoal}>
          <GoalFields hasEmergency={hasEmergency} monthlyCents={monthlyCents} />
        </FormSheet>
      </div>

      {!f.goals.length ? (
        <EmptyState
          icon={PiggyBank}
          title="Comece pela reserva de emergência"
          description="É o dinheiro que segura um imprevisto sem virar dívida. Defina um valor e vá guardando um pouco a cada ciclo."
        />
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2">
        {f.goals.map((g) => {
          const pct = Math.min(100, Math.max(0, (g.savedCents / g.targetCents) * 100));
          const missing = Math.max(0, g.targetCents - g.savedCents);
          return (
            <li key={g.id} className="glass rounded-[1.75rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grad-sun grid h-11 w-11 place-items-center rounded-2xl text-[#3a2300]">
                    {g.kind === "emergency" ? <PiggyBank size={20} aria-hidden /> : <Target size={20} aria-hidden />}
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold">{g.name}</p>
                    <p className="text-[13px] text-ink-soft">Meta de {formatCents(g.targetCents)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <EditGoal goal={g} />
                  <DeleteButton action={archiveGoal} fields={{ id: g.id }} label={`Arquivar ${g.name}`} />
                </div>
              </div>
              <p className="font-display metal-text mt-4 text-3xl font-bold">{formatCents(g.savedCents)}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="grad-sun h-full rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <GoalPlan
                missing={missing}
                targetDate={g.targetDate}
                daysLeft={g.targetDate ? diffInDays(f.today, fromISODate(g.targetDate)) : null}
                freeCents={f.summary.freeCents}
              />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <FormSheet
                  title={`Guardar em ${g.name}`}
                  trigger="Guardar"
                  submitLabel="Guardar"
                  action={contributeGoal}
                  hidden={{ goal_id: g.id, direction: "in" }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Quanto">
                      <MoneyInput name="amount" required autoFocus />
                    </Field>
                    <Field label="Quando">
                      <TextInput name="contributed_on" type="date" required defaultValue={toISODate(f.today)} />
                    </Field>
                  </div>
                </FormSheet>
                <FormSheet
                  title={`Retirar de ${g.name}`}
                  trigger="Retirar"
                  submitLabel="Registrar retirada"
                  action={contributeGoal}
                  hidden={{ goal_id: g.id, direction: "out" }}
                  variant="glass"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Quanto">
                      <MoneyInput name="amount" required autoFocus />
                    </Field>
                    <Field label="Quando">
                      <TextInput name="contributed_on" type="date" required defaultValue={toISODate(f.today)} />
                    </Field>
                  </div>
                </FormSheet>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Diz quanto guardar por mês e por semana para chegar no prazo.
function GoalPlan({
  missing,
  targetDate,
  daysLeft,
  freeCents,
}: {
  missing: number;
  targetDate: string | null;
  daysLeft: number | null;
  freeCents: number;
}) {
  if (missing === 0) return <p className="mt-2 text-[13px] font-semibold text-gain">Meta alcançada.</p>;
  if (!targetDate || daysLeft === null) {
    return (
      <p className="mt-2 text-[13px] text-ink-soft">
        Faltam {formatCents(missing)}. Coloque um “até quando” no lápis para o Dimeta dizer quanto guardar.
      </p>
    );
  }
  if (daysLeft < 0) {
    return (
      <p className="mt-2 text-[13px] text-loss">
        O prazo passou e faltam {formatCents(missing)}. Mude a data no lápis para recalcular.
      </p>
    );
  }
  const weeks = Math.max(1, Math.ceil((daysLeft + 1) / 7));
  const months = Math.max(1, Math.ceil((daysLeft + 1) / 30.4));
  const perMonth = Math.ceil(missing / months);
  const perWeek = Math.ceil(missing / weeks);
  const tight = perMonth > Math.max(0, freeCents);
  return (
    <div className="mt-3 rounded-2xl bg-white/[0.04] p-3 text-[13px]">
      <p className="text-ink-soft">
        Faltam <strong className="text-ink">{formatCents(missing)}</strong> em {daysLeft}{" "}
        {daysLeft === 1 ? "dia" : "dias"}.
      </p>
      <p className="mt-1">
        Guarde <strong className="text-sun">{formatCents(perMonth)} por mês</strong> ou{" "}
        <strong className="text-sun">{formatCents(perWeek)} por semana</strong>.
      </p>
      {tight ? (
        <p className="mt-1 text-loss">É mais do que você tem livre neste ciclo. Talvez valha esticar o prazo.</p>
      ) : null}
    </div>
  );
}
