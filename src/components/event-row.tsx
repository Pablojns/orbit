import { Bell, BookOpen, CalendarCheck, Check, Clock, FileWarning, GraduationCap, Receipt, Repeat } from "lucide-react";
import { DeleteButton } from "@/components/undo";
import { deleteEvent, toggleEventDone } from "@/app/app/actions";
import type { AgendaEvent, ChecklistItem } from "@/lib/routine";
import { Checklist } from "./checklist";
import { EditEvent } from "./edit-forms";

export const KIND = {
  exam: { label: "Prova", icon: BookOpen },
  appointment: { label: "Compromisso", icon: CalendarCheck },
  deadline: { label: "Entrega", icon: FileWarning },
  bill: { label: "Conta", icon: Receipt },
  other: { label: "Outro", icon: Clock },
  study: { label: "Estudo", icon: GraduationCap },
} as const;

export function countdown(days: number) {
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days > 1) return `Em ${days} dias`;
  return days === -1 ? "Ontem" : `Há ${-days} dias`;
}

export function EventRow({
  e,
  compact,
  checklist,
}: {
  e: AgendaEvent;
  compact?: boolean;
  checklist?: ChecklistItem[];
}) {
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
    <li className="flex items-start gap-2.5 py-3">
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
          e.done ? "bg-gain/15 text-gain" : urgent ? "bg-sun/20 text-sun" : "bg-white/[0.06]"
        }`}
      >
        <Icon size={19} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-medium ${e.done ? "text-ink-soft line-through" : ""}`}>{e.title}</p>
        <p className="text-[13px] leading-snug text-ink-soft">
          {!e.done ? (
            <span className={`font-semibold ${e.daysLeft < 0 ? "text-loss" : urgent ? "text-sun" : "text-ink"}`}>
              {countdown(e.daysLeft)}
            </span>
          ) : (
            <span className="font-semibold text-gain">Feito</span>
          )}
          {", "}
          {label.toLowerCase()}, {dateLabel}
          {e.time ? ` às ${e.time}` : ""}
          {e.seriesId ? (
            <Repeat size={11} className="ml-1 inline align-[-1px]" aria-label="Faz parte de uma série" />
          ) : null}
          {e.remindDays ? (
            <span className="ml-1 whitespace-nowrap" title={`Aviso ${e.remindDays} dia(s) antes`}>
              <Bell size={11} className="inline align-[-1px]" aria-hidden /> {e.remindDays}d
            </span>
          ) : null}
        </p>
        {!compact && (e.kind === "exam" || e.kind === "deadline" || (checklist && checklist.length)) ? (
          <Checklist parentType="event" parentId={e.id} items={checklist ?? []} />
        ) : null}
      </div>
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
          <DeleteButton action={deleteEvent} fields={{ id: e.id }} label={`Excluir ${e.title}`} />
        </>
      ) : null}
    </li>
  );
}
