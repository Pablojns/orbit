"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { restoreTrash, type UndoResult } from "@/app/app/actions";

type Toast = { id: number; message: string; trashId: string };
const Ctx = createContext<(r: UndoResult) => void>(() => {});

// Aviso "Desfazer" que aparece por 6 segundos depois de apagar algo.
export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [restoring, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((r: UndoResult) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), ...r });
    timer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && typeof document !== "undefined"
        ? createPortal(
            <div className="app-vars pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 lg:bottom-8">
              <div
                role="status"
                className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-line bg-[#141a36] py-2.5 pr-2.5 pl-4 text-[15px] shadow-2xl"
              >
                <span>{toast.message}</span>
                <button
                  type="button"
                  disabled={restoring}
                  onClick={() =>
                    start(async () => {
                      await restoreTrash(toast.trashId);
                      setToast(null);
                    })
                  }
                  className="rounded-xl bg-cobalt/20 px-3 py-1.5 text-sm font-semibold text-cobalt disabled:opacity-60"
                >
                  {restoring ? "Voltando…" : "Desfazer"}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </Ctx.Provider>
  );
}

// Botão de apagar/arquivar que oferece "Desfazer".
export function DeleteButton({
  action,
  fields,
  label,
  variant = "icon",
  text = "Remover",
}: {
  action: (fd: FormData) => Promise<UndoResult | void>;
  fields: Record<string, string>;
  label: string;
  variant?: "icon" | "text";
  text?: string;
}) {
  const show = useContext(Ctx);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          for (const [k, v] of Object.entries(fields)) fd.set(k, v);
          const r = await action(fd);
          if (r) show(r);
        })
      }
      className={
        variant === "icon"
          ? "grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft hover:text-loss disabled:opacity-40"
          : "text-xs text-ink-soft hover:text-loss disabled:opacity-40"
      }
    >
      {variant === "icon" ? <Trash2 size={15} aria-hidden /> : text}
    </button>
  );
}
