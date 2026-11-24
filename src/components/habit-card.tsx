import { Check, Flame } from "lucide-react";
import { DeleteButton } from "@/components/undo";
import { archiveHabit, toggleHabit } from "@/app/app/actions";
import type { Habit } from "@/lib/routine";
import { EditHabit } from "./edit-forms";

const WEEKDAY = ["D", "S", "T", "Q", "Q", "S", "S"];

export function HabitCheck({ h, size = "md" }: { h: Habit; size?: "md" | "lg" }) {
  const dim = size === "lg" ? "h-12 w-12" : "h-10 w-10";
  return (
    <form action={toggleHabit}>
      <input type="hidden" name="habit_id" value={h.id} />
      <input type="hidden" name="checked" value={String(h.checkedToday)} />
      <button
        type="submit"
        aria-label={h.checkedToday ? `Desmarcar ${h.name} hoje` : `Marcar ${h.name} hoje`}
        className={`grid ${dim} place-items-center rounded-2xl border transition-colors ${
          h.checkedToday
            ? "grad-primary border-transparent text-white"
            : "border-white/20 text-ink-soft hover:border-cobalt"
        }`}
      >
        <Check size={20} strokeWidth={3} aria-hidden />
      </button>
    </form>
  );
}

export function HabitCard({ h }: { h: Habit }) {
  const pct = Math.min(100, (h.weekCount / h.targetPerWeek) * 100);
  return (
    <li className="glass rounded-3xl p-5">
      <div className="flex items-center gap-4">
        <HabitCheck h={h} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold">{h.name}</p>
          <p className="text-[13px] text-ink-soft">
            {h.weekCount} de {h.targetPerWeek} nos últimos 7 dias
          </p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1 font-display text-xl font-bold">
            <Flame size={18} className={h.streak ? "text-sun" : "text-ink-soft"} aria-hidden /> {h.streak}
          </p>
          <p className="text-[11px] text-ink-soft">{h.streak === 1 ? "dia seguido" : "dias seguidos"}</p>
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="grad-primary h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <ol className="flex gap-1.5" aria-label="Últimos 7 dias">
          {h.last7.map((d) => {
            const wd = WEEKDAY[new Date(`${d.date}T12:00:00Z`).getUTCDay()];
            return (
              <li key={d.date} className="flex flex-col items-center gap-1">
                <span
                  className={`h-6 w-6 rounded-lg ${d.checked ? "grad-primary" : "border border-white/12 bg-white/[0.03]"}`}
                  aria-label={`${d.date}: ${d.checked ? "feito" : "não feito"}`}
                />
                <span className="text-[10px] text-ink-soft">{wd}</span>
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-1">
          <EditHabit habit={h} />
          <DeleteButton
            action={archiveHabit}
            fields={{ id: h.id }}
            label={`Arquivar ${h.name}`}
            variant="text"
            text="Arquivar"
          />
        </div>
      </div>
    </li>
  );
}
