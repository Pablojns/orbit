"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app/dinheiro", label: "Extrato" },
  { href: "/app/dinheiro/cartoes", label: "Cartões" },
  { href: "/app/dinheiro/contas", label: "Contas fixas" },
  { href: "/app/dinheiro/metas", label: "Metas" },
  { href: "/app/dinheiro/pessoas", label: "Empréstimos" },
];

export function MoneyTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções do dinheiro" className="-mx-5 mb-5 shrink-0 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-1 rounded-2xl border border-white/[0.07] bg-[#0f1634] p-1">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center rounded-xl px-4 text-sm font-bold whitespace-nowrap transition-colors ${
                  active ? "grad-primary text-white" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
