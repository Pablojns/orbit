"use client";

import { useActionState } from "react";
import { type SubState, subscribe } from "./actions";

export function SubscribeForm() {
  const [state, action, pending] = useActionState<SubState, FormData>(
    subscribe,
    { status: "idle" },
  );
  const input =
    "mt-1.5 h-12 w-full rounded-2xl border border-white/[0.1] bg-[#0f1634] px-4 text-base outline-none focus:border-[#a78bfa]";
  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block text-sm text-ink-soft">
        Nome completo
        <input name="name" required autoComplete="name" className={input} />
      </label>
      <label className="block text-sm text-ink-soft">
        CPF (o meio de pagamento exige para emitir a cobrança)
        <input
          name="cpf"
          required
          inputMode="numeric"
          autoComplete="off"
          className={input}
        />
      </label>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-loss">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="grad-primary h-12 w-full rounded-2xl text-base font-bold text-white disabled:opacity-60"
      >
        {pending ? "Um momento…" : "Assinar por R$ 29,90 por mês"}
      </button>
      <p className="text-center text-xs text-ink-soft">
        Pague com Pix, cartão ou boleto. Cancele quando quiser.
      </p>
    </form>
  );
}
