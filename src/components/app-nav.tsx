"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Flame, House, UserRound, Wallet } from "lucide-react";
import { Logo } from "./logo";

const ITEMS = [
  { href: "/app", label: "Início", icon: House },
  { href: "/app/dinheiro", label: "Dinheiro", icon: Wallet },
  { href: "/app/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/app/habitos", label: "Hábitos", icon: Flame },
  { href: "/app/perfil", label: "Perfil", icon: UserRound },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
}

// Celular: barra fixa embaixo.
export function BottomNav() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-cobalt" : "text-ink-soft hover:text-ink"
                }`}
              >
                <span
                  className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                    active ? "bg-cobalt-soft" : ""
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.9} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Computador: menu lateral.
export function SideNav() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Navegação principal"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-card px-4 py-6 lg:flex"
    >
      <Link href="/app" className="px-3">
        <Logo />
      </Link>
      <ul className="mt-8 space-y-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                  active ? "bg-cobalt-soft text-cobalt" : "text-ink-soft hover:bg-sky hover:text-ink"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.9} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
