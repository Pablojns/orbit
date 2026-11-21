import { Bell, BookOpen, CalendarCheck, Check, Clock, FileWarning, GraduationCap, Receipt, Repeat } from "lucide-react";
import { DeleteButton } from "@/components/undo";
import { deleteEvent, toggleEventDone } from "@/app/app/actions";
import type { AgendaEvent, ChecklistItem, EventType } from "@/lib/routine";
import { ChecklistPanel } from "./checklist";
import { EditEvent } from "./edit-forms";
import { ItemShell } from "./item-shell";

export const KIND = {
  exam: { label: "Prova", icon: BookOpen },
  appointment: { label: "Compromisso", icon: CalendarCheck },
  deadline: { label: "Entrega", icon: FileWarning },
  bill: { label: "Conta", icon: Receipt },
  other: { label: "Outro", icon: Clock },
  study: { label: "Estudo", icon: GraduationCap },
} as const;

export const PRIORITY: Record<number, { label: string; tone: string }> = {
  1: { label: "Alta", tone: "bg-loss/15 text-loss" },
  2: { label: "Média", tone: "bg-sun/20 text-sun" },
  3: { label: "Baixa", tone: "bg-white/[0.06] text-ink-soft" },
};

export function countdown(days: number) {
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days > 1) return `Em ${days} dias`;
  return days === -1 ? "Ontem" : `Há ${-days} dias`;
}

function dateLabelOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replace(/\./g, "");
}

function TypeIcon({ e }: { e: AgendaEvent }) {
  const Icon = KIND[e.kind]?.icon ?? Clock;
  return (
    <span
      className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
      style={{ backgroundColor: `${e.done ? "#3ee0a8" : e.color}26`, color: e.done ? "#3ee0a8" : e.color }}
    >
      <Icon size={18} aria-hidden />
    </span>
  );
}

function Meta({ e, hideDate }: { e: AgendaEvent; hideDate?: boolean }) {
  const urgent = !e.done && e.daysLeft <= 2;
  return (
    <p className="text-[13px] leading-snug text-ink-soft">
      {!e.done ? (
        <span className={`font-semibold ${e.daysLeft < 0 ? "text-loss" : urgent ? "text-sun" : "text-ink"}`}>
          {countdown(e.daysLeft)}
        </span>
      ) : (
        <span className="font-semibold text-gain">Feito</span>
      )}
      {", "}
      {e.typeName.toLowerCase()}
      {hideDate ? (e.time ? `, ${e.time}` : "") : `, ${dateLabelOf(e.date)}${e.time ? ` às ${e.time}` : ""}`}
      {e.seriesId ? <Repeat size={11} className="ml-1 inline align-[-1px]" aria-label="Faz parte de uma série" /> : null}
      {e.remindDays ? (
        <span className="ml-1 whitespace-nowrap" title={`Aviso ${e.remindDays} dia(s) antes`}>
          <Bell size={11} className="inline align-[-1px]" aria-hidden /> {e.remindDays}d
        </span>
      ) : null}
      {e.priority && !e.done ? (
        <span className={`ml-1.5 rounded-full px-1.5 py-px text-[11px] font-semibold ${PRIORITY[e.priority].tone}`}>
          {PRIORITY[e.priority].label}
        </span>
      ) : null}
    </p>
  );
}

export function EventRow({
  e,
  compact,
  checklist,
  types = [],
  hideDate,
}: {
  e: AgendaEvent;
  hideDate?: boolean;
  compact?: boolean;
  checklist?: ChecklistItem[];
  types?: EventType[];
}) {
  const title = (
    <p className={`text-[15px] leading-snug font-medium break-words ${e.done ? "text-ink-soft line-through" : ""}`}>
      {e.title}
    </p>
  );

  if (compact) {
    return (
      <li className="flex items-start gap-3 py-3">
        <TypeIcon e={e} />
        <div className="min-w-0 flex-1">
          {title}
          <Meta e={e} />
        </div>
      </li>
    );
  }

  const steps = checklist ?? [];
  return (
    <ItemShell
      title={e.title}
      icon={<TypeIcon e={e} />}
      body={
        <>
          {title}
          <Meta e={e} hideDate={hideDate} />
        </>
      }
      actions={
        <>
          <EditEvent e={e} types={types} />
          <DeleteButton action={deleteEvent} fields={{ id: e.id }} label={`Excluir ${e.title}`} />
        </>
      }
      check={
        <form action={toggleEventDone}>
          <input type="hidden" name="id" value={e.id} />
          <input type="hidden" name="done" value={String(e.done)} />
          <button
            type="submit"
            aria-label={e.done ? `Reabrir ${e.title}` : `Concluir ${e.title}`}
            title={e.done ? "Reabrir" : "Marcar como feito"}
            className={`ml-1 grid h-9 w-9 place-items-center rounded-full border ${
              e.done ? "border-gain bg-gain text-[#05201a]" : "border-white/20 text-transparent hover:text-ink-soft"
            }`}
          >
            <Check size={16} strokeWidth={3} aria-hidden />
          </button>
        </form>
      }
      steps={<ChecklistPanel parentType="event" parentId={e.id} items={steps} />}
      stepsCount={steps.length}
      stepsDone={steps.filter((s) => s.done).length}
    />
  );
}
