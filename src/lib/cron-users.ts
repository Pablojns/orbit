import "server-only";
import { AUTH_ENABLED } from "@/lib/flags";
import { OWNER_ID } from "@/lib/owner";
import { runAs } from "@/lib/run-as";
import { createAdminClient } from "@/lib/supabase/admin";

// Roda uma tarefa para cada pessoa. Login desligado: só o dono do modo teste (como hoje).
export async function forEachUser<T>(fn: () => Promise<T>): Promise<T[]> {
  if (!AUTH_ENABLED) return [await fn()];
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id");
  const out: T[] = [];
  for (const p of data ?? []) {
    try {
      out.push(await runAs(p.id as string, fn));
    } catch (err) {
      console.error("[cron] falhou para uma pessoa", (err as Error).message);
    }
  }
  return out;
}
