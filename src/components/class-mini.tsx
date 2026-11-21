import { GraduationCap } from "lucide-react";
import { countdown } from "./event-row";
import { type CalendarDate, diffInDays, fromISODate } from "@/lib/dates";
import type { ClassSlot } from "@/lib/studies-math";

// Aula do horário de Estudos numa lista curta (Início).
export function ClassMini({ o, today }: { o: { date: string; slot: ClassSlot }; today: CalendarDate }) {
  const days = diffInDays(today, fromISODate(o.date));
  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#A3E635]/15 text-[#A3E635]">
        <GraduationCap size={18} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-medium">Aula: {o.slot.subjectName}</p>
        <p className="text-[13px] text-ink-soft">
          <span className={`font-semibold ${days === 0 ? "text-sun" : "text-ink"}`}>{countdown(days)}</span>, às{" "}
          {o.slot.startsAt}
          {o.slot.room ? `, ${o.slot.room}` : ""}
        </p>
      </div>
    </li>
  );
}
