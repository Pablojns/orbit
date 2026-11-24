"use client";

import { useEffect } from "react";

// Erro em qualquer tela do app: explica, registra e oferece tentar de novo.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Aparece nos registros da Vercel (Runtime Logs) junto com o código do erro.
    console.error("[dimeta] erro na tela", error.digest ?? "", error.message);
  }, [error]);
  return (
    <div className="mx-auto max-w-md pt-16 text-center">
      <h1 className="text-2xl">Algo deu errado nesta tela</h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        Seus dados estão salvos. Tente de novo; se continuar, volte ao Início e abra a tela outra vez.
      </p>
      {error.digest ? <p className="mt-2 text-xs text-ink-soft">Código: {error.digest}</p> : null}
      <div className="mt-6 flex justify-center gap-2.5">
        <button type="button" onClick={reset} className="grad-primary h-11 rounded-2xl px-5 text-sm font-bold text-white">
          Tentar de novo
        </button>
        <a href="/app" className="flex h-11 items-center rounded-2xl border border-white/[0.14] px-5 text-sm font-bold">
          Ir para o Início
        </a>
      </div>
    </div>
  );
}
