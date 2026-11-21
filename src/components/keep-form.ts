"use client";

import { startTransition } from "react";

// O React limpa o formulário toda vez que a ação termina, até quando dá erro.
// Enviando por aqui, o que a pessoa digitou fica no lugar; quem quiser limpar limpa ao salvar.
export function keepOnSubmit(action: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}
