import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const OLD_HOST = "orbit-orcin-beta.vercel.app";
const NEW_HOST = "dimeta.vercel.app";

export async function proxy(request: NextRequest) {
  // Endereço antigo leva para o novo (menos as rotas internas de aviso).
  if (request.headers.get("host") === OLD_HOST && !request.nextUrl.pathname.startsWith("/api/")) {
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
