"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";

// Linha de item da agenda: ícones pequenos e alinhados no fim (passos, editar, apagar)
// e, ao tocar em "passos", a lista de passos abre embaixo da linha.
export function ItemShell({
  icon,
  body,
  actions,
  check,
  steps,
  stepsCount,
  stepsDone,
  title,
  dense,
}: {
  dense?: boolean;
  icon: React.ReactNode;
  body: React.ReactNode;
  actions: React.ReactNode;
  check: React.ReactNode;
  steps: React.ReactNode;
  stepsCount: number;
  stepsDone: number;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className={dense ? "py-2" : "py-3"}>
      <div className={`flex items-start ${dense ? "gap-2.5" : "gap-3"}`}>
        {icon}
        <div className="min-w-0 flex-1">{body}</div>
        <div
          className={`flex shrink-0 items-center ${
            dense
              ? "[&_button]:h-7 [&_button]:w-7 [&_svg]:h-[13px] [&_svg]:w-[13px] opacity-70 hover:opacity-100"
              : ""
          }`}
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`Passos de ${title}`}
            title="Passos"
            className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/[0.06] ${
              open || stepsCount ? "text-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            <ListChecks size={15} aria-hidden />
            {stepsCount ? (
              <span className="absolute -top-0.5 right-0 rounded-full bg-cobalt/25 px-1 text-[9px] leading-[14px] font-semibold text-cobalt">
                {stepsDone}/{stepsCount}
              </span>
            ) : null}
          </button>
          {actions}
          {check}
        </div>
      </div>
      {open ? (
        <div className={`mt-2 ${dense ? "pl-5" : "pl-[3.25rem]"}`}>{steps}</div>
      ) : null}
    </li>
  );
}
