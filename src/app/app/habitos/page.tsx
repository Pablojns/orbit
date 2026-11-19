import { Flame } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Field, Select, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import { HabitCard } from "@/components/habit-card";
import { PageHeader } from "@/components/page-header";
import { saveHabit } from "@/app/app/actions";
import { getHabits } from "@/lib/routine";

export const metadata = { title: "Hábitos" };
export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const habits = await getHabits();
  const doneToday = habits.filter((h) => h.checkedToday).length;

  return (
    <>
      <PageHeader
        title="Hábitos"
        subtitle={
          habits.length
            ? `${doneToday} de ${habits.length} feitos hoje.`
            : "Pequenas coisas que você quer fazer com frequência."
        }
      />
      <div className="mb-5 flex justify-end">
        <FormSheet title="Novo hábito" trigger="Hábito" submitLabel="Criar hábito" action={saveHabit}>
          <Field label="Hábito">
            <TextInput name="name" required maxLength={60} placeholder="Ex.: Estudar 30 minutos" />
          </Field>
          <Field label="Quantas vezes por semana">
            <Select
              name="target_per_week"
              defaultValue="7"
              options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({
                value: String(n),
                label: n === 7 ? "Todo dia" : `${n}x por semana`,
              }))}
            />
          </Field>
          <p className="text-xs text-ink-soft">Perder um dia só zera a sequência. Sem punição.</p>
        </FormSheet>
      </div>
      {habits.length ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {habits.map((h) => (
            <HabitCard key={h.id} h={h} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Flame}
          title="Nenhum hábito criado"
          description="Comece com um só. Hábitos pequenos e fáceis duram mais do que listas grandes."
        />
      )}
    </>
  );
}
