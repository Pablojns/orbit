"use client";

import { useActionState, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Plus, X } from "lucide-react";
import type { FormState } from "@/app/app/actions";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

// Botão que abre um painel com formulário. Fecha sozinho quando salva.
export function FormSheet({
  title,
  trigger,
  submitLabel,
  action,
  children,
  hidden,
  variant = "primary",
}: {
  title: string;
  trigger: string;
  submitLabel: string;
  action: Action;
  children: React.ReactNode;
  hidden?: Record<string, string>;
  variant?: "primary" | "glass" | "link" | "edit";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const result = await action(prev, fd);
      if (result.status === "saved") setOpen(false);
      return result;
    },
    { status: "idle" },
  );

  const triggerClass =
    variant === "primary"
      ? "grad-primary flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[15px] font-semibold text-white"
      : variant === "glass"
        ? "glass flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[15px] font-semibold"
        : "flex items-center gap-1 text-sm font-semibold text-cobalt";

  return (
    <>
      {variant === "edit" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={trigger}
          title={trigger}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-white/[0.06] hover:text-ink"
        >
          <Pencil size={15} aria-hidden />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={triggerClass}>
          {variant !== "link" ? <Plus size={18} strokeWidth={2.4} aria-hidden /> : null}
          {trigger}
        </button>
      )}
      {open
        ? createPortal(
            <div className="app-vars fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
              <button type="button" aria-label="Fechar" className="absolute inset-0" onClick={() => setOpen(false)} />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-line bg-[#0d1126] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[2rem]"
                style={{ animation: "sheet-up 220ms cubic-bezier(.2,.8,.2,1)" }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">{title}</h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Fechar"
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-ink-soft"
                  >
                    <X size={20} aria-hidden />
                  </button>
                </div>
                <form action={formAction} className="mt-5 space-y-4">
                  {Object.entries(hidden ?? {}).map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                  ))}
                  {children}
                  {state.status === "error" ? (
                    <p role="alert" className="text-sm text-loss">
                      {state.message}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={pending}
                    className="grad-primary w-full rounded-2xl px-5 py-4 text-base font-semibold text-white disabled:opacity-60"
                  >
                    {pending ? "Salvando…" : submitLabel}
                  </button>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
