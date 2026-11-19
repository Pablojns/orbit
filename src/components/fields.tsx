// Campos de formulário no estilo do app (sem estado; funcionam em qualquer formulário).
const input =
  "mt-1.5 w-full rounded-2xl border border-line bg-white/[0.04] px-4 py-3 text-base text-ink outline-none placeholder:text-white/25 focus:border-cobalt";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-ink-soft">{label}</span>
      {hint ? <span className="block text-xs text-ink-soft/70">{hint}</span> : null}
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={input} />;
}

export function MoneyInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-[calc(50%+3px)] left-4 -translate-y-1/2 text-ink-soft">R$</span>
      <input inputMode="decimal" autoComplete="off" placeholder="0,00" {...props} className={`${input} pl-11`} />
    </div>
  );
}

export function DaySelect({ name, defaultValue }: { name: string; defaultValue?: number }) {
  return (
    <select name={name} defaultValue={defaultValue ?? 10} className={input}>
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
        <option key={d} value={d} className="bg-[#0d1126]">
          Dia {d}
        </option>
      ))}
    </select>
  );
}

export function Select({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue} className={input}>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#0d1126]">
          {o.label}
        </option>
      ))}
    </select>
  );
}
