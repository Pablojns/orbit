"use client";

import { useRef, useState } from "react";
import { PERIODS, type PeriodKind } from "@/lib/period";

// Seletor de período do Extrato: muda na hora; datas só em "Personalizado".
export function PeriodPicker({ kind, de, ate }: { kind: PeriodKind; de: string; ate: string }) {
  const [k, setK] = useState(kind);
  const formRef = useRef<HTMLFormElement>(null);
  const field = "h-10 rounded-xl border border-white/[0.1] bg-[#0f1634] px-2.5 text-sm";
  return (
    <form ref={formRef} method="get" className="flex flex-wrap items-center gap-2" aria-label="Período">
      <select
        name="periodo"
        value={k}
        aria-label="Período"
        onChange={(e) => {
          const v = e.target.value as PeriodKind;
          setK(v);
          if (v !== "personalizado") requestAnimationFrame(() => formRef.current?.requestSubmit());
        }}
        className={`${field} px-3 font-bold`}
      >
        {PERIODS.map((p) => (
          <option key={p.kind} value={p.kind}>
            {p.label}
          </option>
        ))}
      </select>
      {k === "personalizado" ? (
        <>
          <input type="date" name="de" defaultValue={de} aria-label="De" className={field} />
          <input type="date" name="ate" defaultValue={ate} aria-label="Até" className={field} />
          <button type="submit" className="h-10 rounded-xl bg-white/[0.08] px-3.5 text-sm font-bold hover:bg-white/[0.12]">
            Ver
          </button>
        </>
      ) : null}
    </form>
  );
}
