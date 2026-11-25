import { Check, CircleCheck } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { EditHabit } from "@/components/edit-forms";
import { Field, Select, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import { DeleteButton } from "@/components/undo";
import { SheetButton } from "@/components/sheet-button";
import { archiveHabit, saveHabit, toggleHabit } from "@/app/app/actions";
import { todayInSaoPaulo, toISODate } from "@/lib/dates";
import { getHabits } from "@/lib/routine";

export const metadata = { title: "Hábitos" };
export const dynamic = "force-dynamic";

const LETTER = ["D", "S", "T", "Q", "Q", "S", "S"];

function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { day: d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

export default async function HabitsPage() {
  const habits = await getHabits();
  const todayISO = toISODate(todayInSaoPaulo());
  const weekDone = habits.reduce(
    (a, h) => a + h.last7.filter((d) => d.checked).length,
    0,
  );

  const total = (
    <section className="hero-card rounded-3xl px-5 py-[18px] lg:p-6">
      <p className="text-[13px] font-bold text-[#b9c2f5] lg:text-sm">
        Últimos 7 dias
      </p>
      <p className="mt-0.5 text-[34px] leading-[1.05] font-extrabold tracking-[-0.02em] lg:text-[40px]">
        {weekDone} {weekDone === 1 ? "marcação" : "marcações"}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#c7cff7]">
        somando todos os hábitos
      </p>
    </section>
  );

  return (
    <div className="pt-5 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:pt-7">
      <header className="flex items-center justify-between gap-3 lg:pr-14">
        <h1 className="text-2xl leading-tight lg:text-[28px]">Hábitos</h1>
        <FormSheet
          title="Novo hábito"
          trigger="Novo hábito"
          submitLabel="Criar hábito"
          action={saveHabit}
          triggerClassName="grad-primary flex h-11 shrink-0 items-center justify-center rounded-2xl px-5 text-sm font-bold text-white"
        >
          <Field label="Hábito">
            <TextInput
              name="name"
              required
              maxLength={60}
              placeholder="Ex.: Estudar 30 minutos"
            />
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
          <p className="text-xs text-ink-soft">
            Perder um dia só zera a sequência. Sem punição.
          </p>
        </FormSheet>
      </header>

      {habits.length ? (
        <div className="mt-5 grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:items-start lg:gap-5">
          <div className="lg:hidden">{total}</div>
          <ul className="space-y-4 lg:max-h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            {habits.map((h) => (
              <li
                key={h.id}
                className="glass flex flex-col gap-4 rounded-3xl p-[18px] lg:px-6 lg:py-[22px]"
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-extrabold lg:text-lg">
                      {h.name}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-ink-soft lg:text-[13px]">
                      {h.targetPerWeek === 7
                        ? "todos os dias"
                        : `${h.targetPerWeek} ${h.targetPerWeek === 1 ? "vez" : "vezes"} por semana`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="rounded-full bg-[#2a2158] px-3 py-1.5 text-xs font-bold text-[#d9ccff] lg:text-[13px]">
                      {h.streakUnit === "semanas"
                        ? h.streak === 1
                          ? "1 semana na meta"
                          : `${h.streak} semanas na meta`
                        : h.streak === 1
                          ? "1 dia seguido"
                          : `${h.streak} dias seguidos`}
                    </span>
                    <EditHabit habit={h} />
                    <DeleteButton
                      action={archiveHabit}
                      fields={{ id: h.id }}
                      label={`Arquivar ${h.name}`}
                    />
                  </div>
                </div>
                <ol
                  className="grid grid-cols-7 gap-1 lg:grid-cols-14 lg:gap-1.5"
                  aria-label={`${h.name}: últimos dias`}
                >
                  {h.last14.map((d, i) => {
                    const { day, wd } = parts(d.date);
                    const isToday = d.date === todayISO;
                    return (
                      <li
                        key={d.date}
                        className={`flex-col items-center gap-1 ${i < 7 ? "hidden lg:flex" : "flex"}`}
                      >
                        <span className="text-[11px] font-bold text-ink-soft">
                          {LETTER[wd]}
                        </span>
                        <form action={toggleHabit} className="w-full">
                          <input type="hidden" name="habit_id" value={h.id} />
                          <input type="hidden" name="date" value={d.date} />
                          <input
                            type="hidden"
                            name="checked"
                            value={String(d.checked)}
                          />
                          <button
                            type="submit"
                            aria-pressed={d.checked}
                            aria-label={`${h.name}, dia ${day}, ${d.checked ? "feito" : "não feito"}`}
                            className={`mx-auto grid h-11 w-full max-w-11 place-items-center rounded-xl border transition-colors lg:rounded-[14px] ${
                              d.checked
                                ? "border-[#4361f5] bg-[#4361f5] text-white"
                                : isToday
                                  ? "border-[#a78bfa] hover:bg-white/[0.05]"
                                  : "border-white/20 hover:bg-white/[0.05]"
                            }`}
                          >
                            {d.checked ? (
                              <Check size={18} strokeWidth={3} aria-hidden />
                            ) : null}
                          </button>
                        </form>
                        <span
                          className={`text-[11px] font-semibold ${isToday ? "text-[#d9ccff]" : "text-ink-soft"}`}
                        >
                          {day}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <SheetButton
                  title={`${h.name}: últimos 35 dias`}
                  className="self-start text-[13px] font-bold text-[#a78bfa] hover:text-white"
                  trigger="Ver histórico do mês"
                >
                  <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-ink-soft">
                    {["S", "T", "Q", "Q", "S", "S", "D"].map((l, i) => (
                      <span key={i}>{l}</span>
                    ))}
                  </div>
                  <ol className="mt-1.5 grid grid-cols-7 gap-1.5">
                    {Array.from(
                      { length: (parts(h.history[0].date).wd + 6) % 7 },
                      (_, i) => (
                        <li key={`v${i}`} aria-hidden />
                      ),
                    )}
                    {h.history.map((d) => {
                      const { day } = parts(d.date);
                      return (
                        <li key={d.date}>
                          <form action={toggleHabit}>
                            <input type="hidden" name="habit_id" value={h.id} />
                            <input type="hidden" name="date" value={d.date} />
                            <input
                              type="hidden"
                              name="checked"
                              value={String(d.checked)}
                            />
                            <button
                              type="submit"
                              aria-pressed={d.checked}
                              aria-label={`${h.name}, dia ${day}, ${d.checked ? "feito" : "não feito"}`}
                              className={`grid h-11 w-full place-items-center rounded-xl border text-[13px] font-bold ${
                                d.checked
                                  ? "border-[#4361f5] bg-[#4361f5] text-white"
                                  : d.date === todayISO
                                    ? "border-[#a78bfa]"
                                    : "border-white/15 text-ink-soft"
                              }`}
                            >
                              {day}
                            </button>
                          </form>
                        </li>
                      );
                    })}
                  </ol>
                  <p className="mt-3 text-sm text-ink-soft">
                    {h.history.filter((d) => d.checked).length} marcações nos
                    últimos 35 dias.
                  </p>
                </SheetButton>
              </li>
            ))}
          </ul>
          <div className="hidden space-y-4 lg:block">{total}</div>
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon={CircleCheck}
            title="Nenhum hábito"
            description="Comece com um só."
          />
        </div>
      )}
    </div>
  );
}
