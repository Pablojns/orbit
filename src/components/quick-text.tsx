"use client";

import { useActionState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { type FormState, quickText } from "@/app/app/actions";
import { useAutoOpen } from "./use-auto-open";

// Lança gasto ou entrada escrevendo uma frase: "mercado 45 pix", "uber 18 nubank", "tênis 600 nubank 3x".
export function QuickText() {
  const [state, action, pending] = useActionState<FormState, FormData>(quickText, { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "saved") formRef.current?.reset();
  }, [state]);
  useAutoOpen("frase", () => formRef.current?.querySelector("input")?.focus());
  return (
    <form ref={formRef} action={action} className="glass rounded-[1.5rem] p-3">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="ml-1 shrink-0 text-cobalt" aria-hidden />
        <input
          name="text"
          required
          maxLength={160}
          autoComplete="off"
          enterKeyHint="send"
          aria-label="Lançar escrevendo"
          placeholder="Ex.: mercado 45 pix · uber 18 nubank · salário 3200 entrada"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-white/30"
        />
        <button
          type="submit"
          disabled={pending}
          className="grad-primary shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "…" : "Lançar"}
        </button>
      </div>
      {state.message ? (
        <p role="status" className={`mt-2 px-1 text-[13px] ${state.status === "error" ? "text-loss" : "text-gain"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
