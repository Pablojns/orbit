import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// "Sair" do Perfil (link simples). Também existe POST /auth/signout.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
