"use client";

import { useActionState, useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { type FormState, saveFirstSalary } from "@/app/app/actions";
import { keepOnSubmit } from "./keep-form";

const SKIP_KEY = "dimeta.salario-inicial.pulou";

// Primeiro acesso: pergunta se o salário deste mês já caiu, para o primeiro ciclo não começar negativo.
// Some sozinho quando existe alguma entrada lançada; "Ainda não" esconde neste aparelho.
export function FirstSalary({ dayLabel }: { dayLabel: string }) {
  const [hidden, setHidden] = useState(true);
  const [state, action, pending] = useActionState<FormState, FormData>(saveFirstSalary, { status: "idle" });
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        setHidden(window.localStorage.getItem(SKIP_KEY) === "1");
      } catch {
        setHidden(false);
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);
  if (hidden || state.status === "saved") return null;

  function skip() {
    try {
      window.localStorage.setItem(SKIP_KEY, "1");
    } catch {
      /* sem armazenamento: só esconde agora */
    }
    setHidden(true);
  }

  return (
    <section className="glass rounded-[1.75rem] p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gain/15 text-gain">
          <Wallet size={19} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Seu salário deste mês já caiu? Quanto?</h2>
          <p className="text-sm text-ink-soft">Ele entra no dia {dayLabel}, e o saldo já começa certo.</p>
          <form onSubmit={keepOnSubmit(action)} className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-2xl border border-line bg-white/[0.04] px-3 py-2">
              <span className="text-ink-soft">R$</span>
              <input
                name="amount"
                inputMode="decimal"
                required
                placeholder="2.800,00"
                aria-label="Quanto caiu"
                className="w-28 bg-transparent text-[15px] outline-none placeholder:text-white/25"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-2xl bg-gain px-4 py-2.5 text-sm font-semibold text-[#05201a] disabled:opacity-60"
            >
              {pending ? "Salvando…" : "Já caiu"}
            </button>
            <button type="button" onClick={skip} className="rounded-2xl bg-white/[0.06] px-4 py-2.5 text-sm font-semibold">
              Ainda não
            </button>
          </form>
          {state.status === "error" ? (
            <p role="alert" className="mt-2 text-sm text-loss">
              {state.message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
