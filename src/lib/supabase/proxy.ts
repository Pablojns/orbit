import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

// Só o app (/app) exige login. O site público, a página de login e as
// páginas legais ficam abertas.
function isProtected(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

// Renova a sessão do Supabase e manda quem não está logado para /login.
export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();
  const { pathname } = request.nextUrl;

  // Sem variáveis configuradas: o site abre, mas app e login mostram a tela de configuração.
  if (!env) {
    if (isProtected(pathname) || pathname === "/login") {
      return NextResponse.redirect(new URL("/setup", request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // IMPORTANTE: não coloque código entre createServerClient e getClaims.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims?.sub);

  if (!loggedIn && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (loggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return response;
}
