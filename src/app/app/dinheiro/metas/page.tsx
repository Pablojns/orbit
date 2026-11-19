import { PiggyBank, Target } from "lucide-react";
import { EditGoal } from "@/components/edit-forms";
import { EmptyState } from "@/components/empty-state";
import { Field, MoneyInput, Select, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import { archiveGoal, contributeGoal, saveGoal } from "@/app/app/actions";
import { diffInDays, fromISODate } from "@/lib/dates";
import { getFinance } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { requireProfile } from "@/lib/profile";

export const metadata = { title: "Metas" };
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const profile = await requireProfile();
  const f = await getFinance(profile.cycleStartDay);
  const hasEmergency = f.goals.some((g) => g.kind === "emergency");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] text-ink-soft">O que você guarda aqui sai do seu livre para gastar.</p>
        <FormSheet title="Nova meta" trigger="Meta" submitLabel="Criar meta" action={saveGoal}>
          <Field label="Tipo">
            <Select
              name="kind"
              defaultValue={hasEmergency ? "custom" : "emergency"}
              options={[
                ...(hasEmergency ? [] : [{ value: "emergency", label: "Reserva de emergência" }]),
                { value: "custom", label: "Outra meta" },
              ]}
            />
          </Field>
          <Field label="Nome">
            <TextInput
              name="name"
              required
              maxLength={60}
              placeholder={hasEmergency ? "Ex.: Viagem" : "Reserva de emergência"}
            />
          </Field>
          <Field label="Quanto quer juntar" hint="Reserva de emergência: o ideal é de 3 a 6 meses dos seus gastos.">
            <MoneyInput name="target" required />
          </Field>
          <Field label="Até quando (opcional)">
            <TextInput name="target_date" type="date" />
          </Field>
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
          const monthsLeft = g.targetDate
            ? Math.max(1, Math.ceil(diffInDays(f.today, fromISODate(g.targetDate)) / 30))
            : null;
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
                  <form action={archiveGoal}>
                    <input type="hidden" name="id" value={g.id} />
                    <button type="submit" className="text-xs text-ink-soft hover:text-loss">
                      Arquivar
                    </button>
                  </form>
                </div>
              </div>
              <p className="font-display metal-text mt-4 text-3xl font-bold">{formatCents(g.savedCents)}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="grad-sun h-full rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-[13px] text-ink-soft">
                {missing === 0
                  ? "Meta alcançada."
                  : `Faltam ${formatCents(missing)}${monthsLeft ? `: cerca de ${formatCents(Math.ceil(missing / monthsLeft))} por mês` : ""}.`}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <FormSheet
                  title={`Guardar em ${g.name}`}
                  trigger="Guardar"
                  submitLabel="Guardar"
                  action={contributeGoal}
                  hidden={{ goal_id: g.id, direction: "in" }}
                >
                  <Field label="Quanto">
                    <MoneyInput name="amount" required autoFocus />
                  </Field>
                </FormSheet>
                <FormSheet
                  title={`Retirar de ${g.name}`}
                  trigger="Retirar"
                  submitLabel="Registrar retirada"
                  action={contributeGoal}
                  hidden={{ goal_id: g.id, direction: "out" }}
                  variant="glass"
                >
                  <Field label="Quanto">
                    <MoneyInput name="amount" required autoFocus />
                  </Field>
                </FormSheet>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
