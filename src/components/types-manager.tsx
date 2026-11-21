"use client";

import { useActionState, useState } from "react";
import { createPortal } from "react-dom";
import { Settings2, X } from "lucide-react";
import { archiveEventType, type FormState, saveEventType, updateEventType } from "@/app/app/actions";
import type { EventType } from "@/lib/routine";
import { DeleteButton } from "./undo";

export const TYPE_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#F4B740",
  "#FF7A93",
  "#5EEAD4",
  "#22C55E",
  "#F97316",
  "#EC4899",
  "#94A3B8",
];

function ColorPicker({ name, value }: { name: string; value: string }) {
  const [color, setColor] = useState(value);
  return (
    <div className="flex flex-wrap gap-1.5">
      <input type="hidden" name={name} value={color} />
      {TYPE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setColor(c)}
          aria-label={`Cor ${c}`}
          aria-pressed={color === c}
          className={`h-6 w-6 rounded-full ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#0d1126]" : ""}`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function TypeForm({ t }: { t?: EventType }) {
  const [state, action, pending] = useActionState<FormState, FormData>(t ? updateEventType : saveEventType, {
    status: "idle",
  });
  return (
    <form action={action} className="space-y-2 rounded-2xl bg-white/[0.04] p-3">
      {t ? <input type="hidden" name="id" value={t.id} /> : null}
      <div className="flex items-center gap-2">
        <input
          name="name"
          required
          maxLength={40}
          defaultValue={t?.name}
          placeholder="Novo tipo, ex.: Academia"
          aria-label={t ? `Nome do tipo ${t.name}` : "Nome do novo tipo"}
          className="min-w-0 flex-1 rounded-xl border border-line bg-white/[0.04] px-3 py-2 text-[15px] outline-none placeholder:text-white/25 focus:border-cobalt"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-cobalt/20 px-3 py-2 text-sm font-semibold text-cobalt disabled:opacity-50"
        >
          {pending ? "…" : t ? "Salvar" : "Criar"}
        </button>
        {t ? <DeleteButton action={archiveEventType} fields={{ id: t.id }} label={`Apagar o tipo ${t.name}`} /> : null}
      </div>
      <ColorPicker name="color" value={t?.color ?? TYPE_COLORS[0]} />
      {state.status === "error" ? <p className="text-xs text-loss">{state.message}</p> : null}
      {state.status === "saved" && !t ? <p className="text-xs text-gain">{state.message}</p> : null}
    </form>
  );
}

// Criar, renomear, trocar a cor e apagar os tipos da agenda.
export function TypesManager({ types }: { types: EventType[] }) {
  const [open, setOpen] = useState(false);
  const active = types.filter((t) => !t.archived);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs font-semibold text-cobalt"
      >
        <Settings2 size={13} aria-hidden /> Editar tipos
      </button>
      {open
        ? createPortal(
            <div className="app-vars fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
              <button type="button" aria-label="Fechar" className="absolute inset-0" onClick={() => setOpen(false)} />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Tipos da agenda"
                className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-line bg-[#0d1126] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[2rem]"
                style={{ animation: "sheet-up 220ms cubic-bezier(.2,.8,.2,1)" }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Tipos da agenda</h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Fechar"
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-ink-soft"
                  >
                    <X size={20} aria-hidden />
                  </button>
                </div>
                <p className="mt-1 text-sm text-ink-soft">Cada tipo tem uma cor na lista e no calendário.</p>
                <div className="mt-4 space-y-2">
                  {active.map((t) => (
                    <TypeForm key={`${t.id}-${t.name}-${t.color}`} t={t} />
                  ))}
                  <TypeForm key={`novo-${active.length}`} />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
