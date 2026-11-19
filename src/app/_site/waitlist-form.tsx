"use client";

import { useActionState } from "react";
import { joinWaitlist, type WaitlistState } from "./actions";

export function WaitlistForm({ id, tone = "light" }: { id?: string; tone?: "light" | "dark" }) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(
    (prev, formData) => {
      // Guarda de onde a pessoa veio (?origem=tiktok ou ?utm_source=instagram).
      const params = new URLSearchParams(window.location.search);
      formData.set("source", params.get("origem") ?? params.get("utm_source") ?? "");
      return joinWaitlist(prev, formData);
    },
    { status: "idle" },
  );

  const dark = tone === "dark";

  if (state.status === "joined") {
    return (
      <div role="status" className={`rounded-3xl px-5 py-4 ${dark ? "bg-white/10 text-white" : "bg-card"}`}>
        <p className="text-lg font-semibold">Você está na lista.</p>
        <p className={`mt-1 text-[15px] ${dark ? "text-white/75" : "text-ink-soft"}`}>
          Quando o Orbit abrir, o convite chega no seu e-mail.
        </p>
      </div>
    );
  }

  return (
    <form id={id} action={action} className="w-full max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Seu e-mail</span>
          <input
            type="email"
            name="email"
            required
            placeholder="seu@email.com"
            autoComplete="email"
            inputMode="email"
            className="w-full rounded-2xl border border-line bg-card px-4 py-3.5 text-base text-ink outline-none focus:border-cobalt"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className={`rounded-2xl px-5 py-3.5 text-base font-semibold transition-opacity disabled:opacity-60 ${
            dark ? "bg-sun text-ink" : "bg-cobalt text-white"
          }`}
        >
          {pending ? "Enviando…" : "Entrar na lista de espera"}
        </button>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className={`mt-3 flex items-start gap-2 text-sm ${dark ? "text-white/75" : "text-ink-soft"}`}>
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-cobalt" />
        Quero receber novidades do Orbit por e-mail. Dá para sair quando quiser.
      </label>
      {state.status === "error" ? (
        <p role="alert" className={`mt-2 text-sm ${dark ? "text-sun" : "text-loss"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
