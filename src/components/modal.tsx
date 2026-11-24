"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Janela única do app (Rodada 4): um nível só; Esc e o "voltar" do celular fecham;
// folha que sobe no celular e janela centralizada no computador; foco preso dentro e
// devolvido a quem abriu.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  label,
  onClose,
  children,
  closeOnBackdrop = true,
  wide = false,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const leavingRef = useRef(false); // fechou porque a pessoa tocou num link para outra tela
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    // "Voltar" do celular: uma entrada no histórico que, ao voltar, só fecha a janela.
    const marker = { dimetaModal: Date.now() };
    window.history.pushState(marker, "");
    let closedByBack = false;
    const onPop = () => {
      closedByBack = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);

    const panel = panelRef.current;
    const first =
      panel?.querySelector<HTMLElement>("[autofocus]") ??
      panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      document.body.style.overflow = prevOverflow;
      // Fechou pelo X, Esc ou ao salvar: tira a entrada extra do histórico.
      if (
        !closedByBack &&
        !leavingRef.current &&
        window.history.state?.dimetaModal === marker.dimetaModal
      ) {
        window.history.back();
      }
      opener?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="app-vars fixed inset-0 z-50 flex items-end justify-center bg-black/65 sm:items-center sm:p-6">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar"
        className="absolute inset-0 cursor-default"
        onClick={() => closeOnBackdrop && onClose()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("a[href]"))
            leavingRef.current = true;
        }}
        className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-white/[0.07] bg-[#0f1634] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl outline-none sm:rounded-3xl sm:pb-5 ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
        style={{ animation: "sheet-up 220ms cubic-bezier(.2,.8,.2,1)" }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Título padrão com botão de fechar.
export function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-extrabold">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-ink-soft hover:text-ink"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
