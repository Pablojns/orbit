"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app/dinheiro", label: "Movimentações" },
  { href: "/app/dinheiro/cartoes", label: "Cartões" },
  { href: "/app/dinheiro/contas", label: "Fixos" },
  { href: "/app/dinheiro/metas", label: "Metas" },
  { href: "/app/dinheiro/pessoas", label: "Pessoas" },
];

export function MoneyTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções do dinheiro" className="-mx-5 mb-5 overflow-x-auto px-5 lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-2 rounded-2xl bg-white/[0.04] p-1">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
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
