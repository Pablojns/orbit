"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Login por e-mail e senha (Rodada 9). Só é usado com AUTH_ENABLED ligado.
type Mode = "entrar" | "criar";

const ERRORS: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha não conferem.",
  "User already registered": "Este e-mail já tem conta. Use Entrar.",
  "Email not confirmed": "Confirme o e-mail pelo link que enviamos antes de entrar.",
};

export function LoginForm({ initialMode = "entrar" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    if (mode === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg({ tone: "error", text: ERRORS[error.message] ?? "Não foi possível entrar agora." });
      window.location.assign("/app");
      return;
    }
    if (password.length < 8) {
      setBusy(false);
      return setMsg({ tone: "error", text: "A senha precisa ter pelo menos 8 caracteres." });
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) return setMsg({ tone: "error", text: ERRORS[error.message] ?? "Não foi possível criar a conta agora." });
    if (data.session) {
      window.location.assign("/app");
      return;
    }
    setMsg({ tone: "info", text: `Enviamos um link de confirmação para ${email}. Abra e depois entre com sua senha.` });
  }

  const input =
    "mt-1.5 h-12 w-full rounded-2xl border border-white/[0.1] bg-[#0f1634] px-4 text-base text-[#eef1ff] outline-none placeholder:text-white/30 focus:border-[#a78bfa]";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/[0.07] bg-[#0f1634] p-1">
        {(["entrar", "criar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setMsg(null);
            }}
            className={`h-11 rounded-xl text-sm font-bold ${mode === m ? "grad-primary text-white" : "text-[#98a2cc]"}`}
          >
            {m === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>
      <label className="block text-sm text-[#98a2cc]">
        E-mail
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
      </label>
      <label className="block text-sm text-[#98a2cc]">
        Senha
        <input
          type="password"
          required
          minLength={mode === "criar" ? 8 : undefined}
          autoComplete={mode === "entrar" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={input}
        />
      </label>
      {msg ? (
        <p role={msg.tone === "error" ? "alert" : "status"} className={`text-sm ${msg.tone === "error" ? "text-[#ff7a93]" : "text-[#b9c6ff]"}`}>
          {msg.text}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="grad-primary h-12 w-full rounded-2xl text-base font-bold text-white disabled:opacity-60">
        {busy ? "Um momento…" : mode === "entrar" ? "Entrar" : "Criar conta e começar 7 dias grátis"}
      </button>
      {mode === "criar" ? (
        <p className="text-center text-xs text-[#98a2cc]">
          Ao criar a conta você aceita os <a href="/termos" className="underline">Termos de uso</a> e a{" "}
          <a href="/privacidade" className="underline">Política de privacidade</a>.
        </p>
      ) : null}
    </form>
  );
}
