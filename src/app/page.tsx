import Link from "next/link";
import { Logo } from "@/components/logo";
import { AUTH_ENABLED } from "@/lib/flags";
import { TRIAL_DAYS } from "@/lib/billing";

export const metadata = {
  title: { absolute: "Dimeta" },
  description: "Dinheiro, metas e estudos em um só lugar.",
};

// Porta de entrada (Rodada 13). A página de vendas oficial fica no Gaia One;
// o texto antigo desta página está em docs/PAGINA-VENDAS-ANTIGA.md.
const START = AUTH_ENABLED ? "/login?modo=criar" : "/app";
const ENTER = AUTH_ENABLED ? "/login" : "/app";

export default function EntryPage() {
  return (
    <main className="app-theme flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-10">
        <Logo size={44} />
        <div className="flex w-full flex-col gap-3">
          <Link
            href={START}
            className="grad-primary flex h-14 items-center justify-center rounded-2xl text-base font-extrabold text-white"
          >
            Começar {TRIAL_DAYS} dias grátis
          </Link>
          <Link
            href={ENTER}
            className="flex h-14 items-center justify-center rounded-2xl border border-white/[0.14] text-base font-bold hover:bg-white/[0.05]"
          >
            Entrar
          </Link>
        </div>
        <nav className="flex gap-5 text-sm text-ink-soft">
          <Link href="/termos" className="hover:text-ink">
            Termos
          </Link>
          <Link href="/privacidade" className="hover:text-ink">
            Privacidade
          </Link>
        </nav>
      </div>
    </main>
  );
}
