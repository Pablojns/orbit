"use server";

import { sendSystemEmail } from "@/lib/email";
import { AUTH_ENABLED } from "@/lib/flags";
import { createClient } from "@/lib/supabase/server";

// Boas-vindas: uma vez por conta (marca welcome_sent nos dados do usuário).
export async function sendWelcome(): Promise<void> {
  if (!AUTH_ENABLED) return;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email || user.user_metadata?.welcome_sent) return;
  const r = await sendSystemEmail(user.email, "welcome");
  if (r.sent) await supabase.auth.updateUser({ data: { welcome_sent: true } });
}
