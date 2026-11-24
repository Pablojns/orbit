"use client";

import { useActionState, useState } from "react";
import { Modal, ModalHeader } from "./modal";
import { keepOnSubmit } from "./keep-form";
import { Pencil, Plus } from "lucide-react";
import { useAutoOpen } from "./use-auto-open";
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
  autoOpen,
  triggerClassName,
}: {
  title: string;
  trigger: string;
  submitLabel: string;
  action: Action;
  children: React.ReactNode;
  hidden?: Record<string, string>;
  variant?: "primary" | "glass" | "link" | "edit";
  autoOpen?: string;
  triggerClassName?: string; // botão com estilo próprio (sem o ícone de +)
}) {
  const [open, setOpen] = useState(false);
  useAutoOpen(autoOpen, () => setOpen(true));
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
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-white/[0.06] hover:text-ink lg:h-9 lg:w-9"
        >
          <Pencil size={15} aria-hidden />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={triggerClassName ?? triggerClass}>
          {variant !== "link" && !triggerClassName ? <Plus size={18} strokeWidth={2.4} aria-hidden /> : null}
          {trigger}
        </button>
      )}
      {open ? (
        <Modal label={title} onClose={() => setOpen(false)}>
          <ModalHeader title={title} onClose={() => setOpen(false)} />
          <form onSubmit={keepOnSubmit(formAction)} className="mt-5 space-y-4">
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
              className="grad-primary h-12 w-full rounded-2xl px-5 text-base font-bold text-white disabled:opacity-60"
            >
              {pending ? "Salvando…" : submitLabel}
            </button>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
