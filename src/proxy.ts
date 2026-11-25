import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { SITE } from "@/lib/site";

// Endereços antigos levam para o atual (NEXT_PUBLIC_SITE_URL). Quando o domínio
// dimeta.com.br for ligado, dimeta.vercel.app também passa a redirecionar.
const OLD_HOSTS = new Set(["orbit-orcin-beta.vercel.app", "dimeta.vercel.app"]);
const NEW_HOST = SITE.host;

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (
    host !== NEW_HOST &&
    OLD_HOSTS.has(host) &&
    !request.nextUrl.pathname.startsWith("/api/")
  ) {
    const url = request.nextUrl.clone();
    url.host = NEW_HOST;
    url.port = "";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }
  return updateSession(request);
}

export const config = {
  // Roda em tudo, menos arquivos estáticos, ícones, manifest e service worker.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
