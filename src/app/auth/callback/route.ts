import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sendWelcome } from "@/app/login/actions";

// Destino do link mágico (e-mail) e do login com Google.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await sendWelcome(); // não repete: só envia se ainda não enviou para esta conta
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      // Conta confirmada pelo link do e-mail: manda as boas-vindas (uma vez só).
      if (type === "signup" || type === "email") await sendWelcome();
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=link`);
}

// Só aceita caminhos internos, para ninguém usar o link para redirecionar
// a pessoa para outro site.
function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}
