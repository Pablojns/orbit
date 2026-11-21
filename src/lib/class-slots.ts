import "server-only";
import { createClient } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import type { ClassSlot, Term } from "@/lib/studies-math";

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

export async function getClassSlots(): Promise<ClassSlot[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_slots")
    .select("id, subject_id, weekday, starts_at, ends_at, room, subject:subjects(name, is_archived)")
    .eq("user_id", OWNER_ID)
    .order("weekday")
    .order("starts_at");
  return (data ?? [])
    .map((c) => {
      const sub = (Array.isArray(c.subject) ? c.subject[0] : c.subject) as { name: string; is_archived: boolean } | null;
      return sub && !sub.is_archived
        ? {
            id: c.id as string,
            subjectId: c.subject_id as string,
            subjectName: sub.name,
            weekday: c.weekday as number,
            startsAt: hhmm(c.starts_at as string) ?? "00:00",
            endsAt: hhmm(c.ends_at as string | null),
            room: (c.room as string | null) ?? null,
          }
        : null;
    })
    .filter((c): c is ClassSlot => c !== null);
}

export async function getTerm(): Promise<Term> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_terms")
    .select("starts_on, ends_on")
    .eq("user_id", OWNER_ID)
    .maybeSingle();
  return data ? { startsOn: data.starts_on as string, endsOn: data.ends_on as string } : null;
}
