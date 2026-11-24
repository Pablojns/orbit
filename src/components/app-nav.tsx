"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleCheck, GraduationCap, House, UserRound, Wallet } from "lucide-react";
import { Logo } from "./logo";

const ITEMS = [
  { href: "/app", label: "Início", icon: House, key: "inicio" },
  { href: "/app/dinheiro", label: "Dinheiro", icon: Wallet, key: "dinheiro" },
  { href: "/app/agenda", label: "Agenda", icon: CalendarDays, key: "agenda" },
  { href: "/app/estudos", label: "Estudos", icon: GraduationCap, key: "estudos" },
  { href: "/app/habitos", label: "Hábitos", icon: CircleCheck, key: "habitos" },
] as const;

export type NavHidden = { studies?: boolean; habits?: boolean };

function useItems(hidden: NavHidden) {
  return ITEMS.filter(
    (it) => !(it.key === "estudos" && hidden.studies) && !(it.key === "habitos" && hidden.habits),
  );
}

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
}

// Celular: barra fixa embaixo com até 5 itens. Perfil fica no ícone do topo.
export function BottomNav({ hidden = {} }: { hidden?: NavHidden }) {
  const isActive = useActive();
  const items = useItems(hidden);
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.07] bg-[#0b1128] pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                  active ? "font-bold text-white" : "font-semibold text-ink-soft hover:text-ink"
                }`}
              >
                <Icon size={22} strokeWidth={2} className={active ? "text-[#a78bfa]" : ""} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Celular: ícone do Perfil no topo das telas.
export function ProfileButton({ initial }: { initial: string }) {
  const pathname = usePathname();
  const active = pathname.startsWith("/app/perfil");
  return (
    <Link
      href="/app/perfil"
      aria-label="Perfil"
      aria-current={active ? "page" : undefined}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[15px] font-extrabold ${
        active ? "bg-[#4361f5] text-white" : "bg-[#151d45] text-[#b9c2f5]"
      }`}
    >
      {initial}
    </Link>
  );
}

// Celular: linha do topo (marca à esquerda, Perfil à direita). O Início tem a própria.
export function MobileTop({ initial }: { initial: string }) {
  const pathname = usePathname();
  if (pathname === "/app") return null;
  return (
    <div className="flex items-center justify-between pt-4 lg:hidden">
      <Link href="/app" aria-label="Início">
        <Logo size={28} />
      </Link>
      <ProfileButton initial={initial} />
    </div>
  );
}

// Computador: menu lateral, com Perfil no rodapé.
export function SideNav({ action, hidden = {} }: { action?: React.ReactNode; hidden?: NavHidden }) {
  const isActive = useActive();
  const items = useItems(hidden);
  const link = (href: string, label: string, Icon: typeof House) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors ${
          active ? "bg-[#151d45] font-bold text-white" : "font-semibold text-ink-soft hover:bg-white/[0.04] hover:text-ink"
        }`}
      >
        <Icon size={20} strokeWidth={2} className={active ? "text-[#a78bfa]" : ""} aria-hidden />
        {label}
      </Link>
    );
  };
  return (
    <nav
      aria-label="Navegação principal"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-white/[0.07] px-5 py-7 lg:flex"
    >
      <Link href="/app" className="px-3">
        <Logo />
      </Link>
      {action ? <div className="mt-7">{action}</div> : null}
      <ul className="mt-6 space-y-1.5">
        {items.map(({ href, label, icon }) => (
          <li key={href}>{link(href, label, icon)}</li>
        ))}
      </ul>
      <div className="mt-auto">{link("/app/perfil", "Perfil", UserRound)}</div>
    </nav>
  );
}
