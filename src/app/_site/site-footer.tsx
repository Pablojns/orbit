import Link from "next/link";
import { Logo } from "@/components/logo";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 border-t border-white/10 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-white [&_circle:last-child]:stroke-ink">
          <Logo size={24} />
        </span>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/privacidade" className="hover:text-white">
            Privacidade
          </Link>
          <Link href="/termos" className="hover:text-white">
            Termos de uso
          </Link>
          <a href={`mailto:${SITE.contactEmail}`} className="hover:text-white">
            Contato
          </a>
        </nav>
        <p className="text-sm">© 2026 {SITE.name}</p>
      </div>
    </footer>
  );
}
