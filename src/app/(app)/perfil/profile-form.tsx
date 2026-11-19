"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileFormState } from "./actions";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function ProfileForm({ displayName, cycleStartDay }: { displayName: string; cycleStartDay: number }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveProfile, { status: "idle" });

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium">Como quer ser chamado</span>
        <input
          name="display_name"
          defaultValue={displayName}
          maxLength={60}
          autoComplete="given-name"
          className="mt-1.5 w-full rounded-2xl border border-line bg-card px-4 py-3 text-base outline-none focus:border-cobalt"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Dia em que seu ciclo começa</span>
        <span className="mt-0.5 block text-sm text-ink-soft">
          Normalmente o dia em que o salário cai. Em meses sem esse dia, o ciclo começa no último dia do mês.
        </span>
        <select
          name="cycle_start_day"
          defaultValue={cycleStartDay}
          className="mt-1.5 w-full rounded-2xl border border-line bg-card px-4 py-3 text-base outline-none focus:border-cobalt"
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>
              Dia {d}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-2xl bg-cobalt px-5 py-3 text-base font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar perfil"}
        </button>
        <p
          role="status"
          className={`text-sm ${state.status === "error" ? "text-loss" : "text-gain"}`}
        >
          {state.message}
        </p>
      </div>
    </form>
  );
}
