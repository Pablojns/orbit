"use client";

import { useState } from "react";
import { Field, MoneyInput, TextInput, inputClass } from "./fields";
import { formatCents } from "@/lib/money";

// Campos da meta nova. No tipo "Reserva de emergência" o nome já vem preenchido e a dica
// mostra o valor: 3 a 6 meses do que a pessoa gasta por mês.
export function GoalFields({ hasEmergency, monthlyCents }: { hasEmergency: boolean; monthlyCents: number }) {
  const [kind, setKind] = useState(hasEmergency ? "custom" : "emergency");
  const emergency = kind === "emergency";
  return (
    <>
      <Field label="Tipo">
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass}>
          {hasEmergency ? null : (
            <option value="emergency" className="bg-[#0d1126]">
              Reserva de emergência
            </option>
          )}
          <option value="custom" className="bg-[#0d1126]">
            Outra meta
          </option>
        </select>
      </Field>
      <Field label="Nome">
        <TextInput
          key={kind}
          name="name"
          required
          maxLength={60}
          defaultValue={emergency ? "Reserva de emergência" : ""}
          placeholder="Ex.: Viagem"
        />
      </Field>
      <Field
        label="Quanto quer juntar"
        hint={
          emergency
            ? monthlyCents > 0
              ? `O ideal é de 3 a 6 meses dos seus gastos: ${formatCents(monthlyCents * 3)} a ${formatCents(monthlyCents * 6)}.`
              : "O ideal é de 3 a 6 meses dos seus gastos."
            : undefined
        }
      >
        <MoneyInput name="target" required />
      </Field>
      <Field label="Até quando (opcional)">
        <TextInput name="target_date" type="date" />
      </Field>
    </>
  );
}
