import Link from "next/link";
import { Logo } from "@/components/logo";
import { SiteFooter } from "./site-footer";

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-theme">
      <header className="mx-auto max-w-3xl px-6 py-5">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 pt-6 pb-20">
        <h1 className="text-4xl leading-tight font-bold">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">Atualizado em {updatedAt}</p>
        <div className="mt-10 max-w-[68ch] space-y-5 text-[16px] leading-[1.7] text-ink [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
