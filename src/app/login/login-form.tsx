"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setError(
        error.status === 429
          ? "Limite de e-mails de acesso atingido por agora. Tente de novo em até 1 hora e use o último link que chegar."
          : "Não foi possível enviar o link. Confira o e-mail e tente de novo.",
      );
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  async function signInWithGoogle() {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setError("O login com Google ainda não está ativado. Use o link por e-mail.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="rounded-3xl bg-card p-5">
        <p className="text-lg font-semibold">Confira seu e-mail</p>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
          Mandamos um link de acesso para <strong className="text-ink">{email}</strong>. Abra no mesmo aparelho para
          entrar.
        </p>
        <button type="button" onClick={() => setStatus("idle")} className="mt-4 text-sm font-medium text-cobalt">
          Usar outro e-mail
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form onSubmit={sendLink} className="space-y-3">
        <label className="block">
          <span className="sr-only">E-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            inputMode="email"
            className="w-full rounded-2xl border border-line bg-card px-4 py-3.5 text-base outline-none focus:border-cobalt"
          />
        </label>
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-2xl bg-cobalt px-5 py-3.5 text-base font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {status === "sending" ? "Enviando…" : "Receber link de acesso"}
        </button>
      </form>

      <button
        type="button"
        onClick={signInWithGoogle}
        className="w-full rounded-2xl border border-line bg-card px-5 py-3.5 text-base font-medium"
      >
        Entrar com Google
      </button>

      {status === "error" ? (
        <p role="alert" className="text-sm text-loss">
          {error}
        </p>
      ) : null}

      <p className="pt-2 text-center text-xs text-ink-soft">Primeira vez? A conta é criada quando você abre o link do e-mail.</p>
    </div>
  );
}
