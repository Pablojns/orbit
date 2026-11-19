"use client";

import { useState } from "react";
import { Field, inputClass, MoneyInput, TextInput } from "./fields";

// Campos extras da conta fixa: dividida, assinatura e código para pagar.
export function BillExtraFields({
  split = "none",
  myShare = "",
  isSubscription = false,
  paymentCode = "",
}: {
  split?: string;
  myShare?: string;
  isSubscription?: boolean;
  paymentCode?: string;
}) {
  const [mode, setMode] = useState(split);
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Divide com alguém?">
          <select name="split" value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass}>
            <option value="none" className="bg-[#0d1126]">
              Não, é só minha
            </option>
            <option value="half" className="bg-[#0d1126]">
              Sim, meio a meio
            </option>
            <option value="fixed" className="bg-[#0d1126]">
              Sim, eu pago um valor
            </option>
          </select>
        </Field>
        {mode === "fixed" ? (
          <Field label="Minha parte">
            <MoneyInput name="my_share" required defaultValue={myShare} />
          </Field>
        ) : (
          <div className="self-end pb-3 text-xs text-ink-soft">
            {mode === "half" ? "Só metade sai do seu livre." : "O valor todo sai do seu livre."}
          </div>
        )}
      </div>
      <label className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px]">
        <input
          type="checkbox"
          name="is_subscription"
          defaultChecked={isSubscription}
          className="h-5 w-5 accent-[#8b97ff]"
        />
        <span>
          É assinatura
          <span className="block text-xs text-ink-soft">Netflix, Spotify… aparece separado e avisa 2 dias antes.</span>
        </span>
      </label>
      <Field
        label="Código para pagar (opcional)"
        hint="Linha digitável do boleto ou Pix copia e cola. Fica a um toque de copiar."
      >
        <TextInput name="payment_code" maxLength={400} defaultValue={paymentCode} placeholder="Cole aqui" />
      </Field>
    </>
  );
}
