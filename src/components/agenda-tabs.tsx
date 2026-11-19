"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app/agenda", label: "Calendário" },
  { href: "/app/agenda/notas", label: "Notas da faculdade" },
];

export function AgendaTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções da agenda" className="mb-5">
      <ul className="flex w-max gap-2 rounded-2xl bg-white/[0.04] p-1">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap ${
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
