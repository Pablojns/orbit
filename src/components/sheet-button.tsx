"use client";

import { useState } from "react";
import { Modal, ModalHeader } from "./modal";

// Botão que abre uma janela com conteúdo pronto (montado no servidor).
// Usado para detalhes: extrato rápido, conta explicada, categoria, item da agenda.
export function SheetButton({
  title,
  label,
  className,
  trigger,
  children,
  wide,
}: {
  title: string;
  label?: string; // nome acessível do botão, se o conteúdo dele não disser
  className?: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
        className={className}
      >
        {trigger}
      </button>
      {open ? (
        <Modal label={title} onClose={() => setOpen(false)} wide={wide}>
          <ModalHeader title={title} onClose={() => setOpen(false)} />
          <div
            className="mt-4"
            onClick={(e) => {
              // Um link dentro da janela leva para outra tela: fecha antes de sair.
              if ((e.target as HTMLElement).closest("a[href]")) setOpen(false);
            }}
          >
            {children}
          </div>
        </Modal>
      ) : null}
    </>
  );
}
