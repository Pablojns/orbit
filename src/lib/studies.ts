import "server-only";
import { createClient } from "@/lib/supabase/server";
import { uid } from "@/lib/user";
import { addDays, type CalendarDate, todayInSaoPaulo, toISODate } from "@/lib/dates";
import { type AgendaEvent, getAgendaMonth } from "@/lib/routine";
import { getClassSlots, getTerm } from "@/lib/class-slots";

export type Subject = {
  id: string;
  name: string;
  pass: number;
  max: number;
  maxAbsences: number | null;
  absences: number;
};
export type Grade = { id: string; subjectId: string; label: string; weight: number; value: number | null };

const n = (v: unknown) => Number(v);

export async function getSubjects(): Promise<Subject[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("id, name, pass_grade, max_grade, max_absences, absences")
    .eq("user_id", (await uid()))
    .eq("is_archived", false)
    .order("created_at");
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    pass: n(s.pass_grade),
    max: n(s.max_grade),
    maxAbsences: s.max_absences === null ? null : n(s.max_absences),
    absences: n(s.absences ?? 0),
  }));
}

export async function getStudies(today: CalendarDate = todayInSaoPaulo()) {
  const supabase = await createClient();
  const [subjects, grades, slots, term] = await Promise.all([
    getSubjects(),
    supabase.from("grades").select("id, subject_id, label, weight, value").eq("user_id", (await uid())).order("created_at"),
    getClassSlots(),
    getTerm(),
  ]);
  // Provas e trabalhos ligados a cada matéria: dos próximos 60 dias (e os que passaram sem marcar feito).
  const horizon = addDays(today, 60);
  const months: { year: number; month: number }[] = [];
  for (let d = { ...today, day: 1 }; toISODate(d) <= toISODate(horizon); ) {
    months.push({ year: d.year, month: d.month });
    d = d.month === 12 ? { year: d.year + 1, month: 1, day: 1 } : { year: d.year, month: d.month + 1, day: 1 };
  }
  const cal = await Promise.all(months.map((m) => getAgendaMonth(m.year, m.month, today)));
  const linked: (AgendaEvent & { subjectId: string })[] = cal
    .flatMap((c) => c.items)
    .filter((i) => i.event?.subjectId && !i.event.done && i.date <= toISODate(horizon))
    .map((i) => ({ ...i.event!, subjectId: i.event!.subjectId! }));

  return {
    subjects,
    grades: (grades.data ?? []).map((g) => ({
      id: g.id as string,
      subjectId: g.subject_id as string,
      label: g.label as string,
      weight: n(g.weight),
      value: g.value === null ? null : n(g.value),
    })) as Grade[],
    slots,
    term,
    linked,
  };
}
