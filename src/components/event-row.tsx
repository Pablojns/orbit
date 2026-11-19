import { BookOpen, CalendarCheck, Check, Clock, FileWarning, Receipt, Trash2 } from "lucide-react";
import { deleteEvent, toggleEventDone } from "@/app/app/actions";
import type { AgendaEvent } from "@/lib/routine";
import { EditEvent } from "./edit-forms";

export const KIND = {
  exam: { label: "Prova", icon: BookOpen },
  appointment: { label: "Compromisso", icon: CalendarCheck },
  deadline: { label: "Prazo", icon: FileWarning },
  bill: { label: "Conta", icon: Receipt },
  other: { label: "Outro", icon: Clock },
} as const;

export function countdown(days: number) {
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days > 1) return `Em ${days} dias`;
  return days === -1 ? "Ontem" : `Há ${-days} dias`;
}

export function EventRow({ e, compact }: { e: AgendaEvent; compact?: boolean }) {
  const { icon: Icon, label } = KIND[e.kind];
  const urgent = !e.done && e.daysLeft <= 2;
  const [y, m, d] = e.date.split("-").map(Number);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replace(/\./g, "");

  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
          e.done ? "bg-gain/15 text-gain" : urgent ? "bg-sun/20 text-sun" : "bg-white/[0.06]"
        }`}
      >
        <Icon size={19} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-medium ${e.done ? "text-ink-soft line-through" : ""}`}>{e.title}</p>
        <p className="truncate text-[13px] text-ink-soft">
          {label}, {dateLabel}
          {e.time ? ` às ${e.time}` : ""}
        </p>
      </div>
      {!e.done ? (
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            e.daysLeft < 0 ? "bg-loss/15 text-loss" : urgent ? "bg-sun/20 text-sun" : "bg-white/[0.06] text-ink-soft"
          }`}
        >
          {countdown(e.daysLeft)}
        </span>
      ) : null}
      {!compact ? (
        <>
          <EditEvent e={e} />
          <form action={toggleEventDone}>
            <input type="hidden" name="id" value={e.id} />
            <input type="hidden" name="done" value={String(e.done)} />
            <button
              type="submit"
              aria-label={e.done ? `Reabrir ${e.title}` : `Concluir ${e.title}`}
              className={`grid h-9 w-9 place-items-center rounded-full border ${
                e.done ? "border-gain bg-gain text-[#05201a]" : "border-white/20 text-transparent hover:text-ink-soft"
              }`}
            >
              <Check size={16} strokeWidth={3} aria-hidden />
            </button>
          </form>
          <form action={deleteEvent}>
            <input type="hidden" name="id" value={e.id} />
            <button
              type="submit"
              aria-label={`Excluir ${e.title}`}
              className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:text-loss"
            >
              <Trash2 size={15} aria-hidden />
            </button>
          </form>
        </>
      ) : null}
    </li>
  );
}
