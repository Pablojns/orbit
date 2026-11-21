import { Field, TextInput } from "./fields";

// Campos extras da conta fixa: assinatura e código para pagar.
export function BillExtraFields({
  isSubscription = false,
  paymentCode = "",
}: {
  isSubscription?: boolean;
  paymentCode?: string;
}) {
  return (
    <>
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
