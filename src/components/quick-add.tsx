"use client";

import { useActionState, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownLeft, ArrowUpRight, Plus, X } from "lucide-react";
import { addMovement, type MovementFormState } from "@/app/app/actions";
import { CategoryIcon } from "./category-icon";
import type { Category } from "@/lib/finance";

type Kind = "expense" | "income";

const METHODS = [
  { value: "pix", label: "Pix" },
  { value: "debit", label: "Débito" },
  { value: "cash", label: "Dinheiro" },
  { value: "transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
];

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function QuickAdd({
  categories,
  variant,
}: {
  categories: Category[];
  variant: "fab" | "expense" | "income" | "sidebar";
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>(variant === "income" ? "income" : "expense");
  const [categoryId, setCategoryId] = useState<string>("");

  const [state, action, pending] = useActionState<MovementFormState, FormData>(
    async (prev, formData) => {
      const result = await addMovement(prev, formData);
      if (result.status === "saved") {
        setOpen(false);
        setCategoryId("");
      }
      return result;
    },
    { status: "idle" },
  );

  function openSheet(k: Kind) {
    setKind(k);
    setCategoryId("");
    setOpen(true);
  }

  const visibleCategories = categories.filter((c) => c.kind === kind);

  return (
    <>
      {variant === "fab" ? (
        <button
          type="button"
          onClick={() => openSheet("expense")}
          aria-label="Novo lançamento"
          className="grad-primary fixed right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 grid h-14 w-14 place-items-center rounded-full text-white lg:hidden"
        >
          <Plus size={26} strokeWidth={2.4} aria-hidden />
        </button>
      ) : null}
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={() => openSheet("expense")}
          className="grad-primary flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[15px] font-semibold text-white"
        >
          <Plus size={18} strokeWidth={2.4} aria-hidden /> Novo lançamento
        </button>
      ) : null}
      {variant === "expense" ? (
        <button
          type="button"
          onClick={() => openSheet("expense")}
          className="grad-primary flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-white"
        >
          <ArrowUpRight size={18} aria-hidden /> Lançar gasto
        </button>
      ) : null}
      {variant === "income" ? (
        <button
          type="button"
          onClick={() => openSheet("income")}
          className="glass flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[15px] font-semibold"
        >
          <ArrowDownLeft size={18} className="text-gain" aria-hidden /> Lançar entrada
        </button>
      ) : null}

      {open
        ? createPortal(
            <div className="app-vars fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
              <button type="button" aria-label="Fechar" className="absolute inset-0" onClick={() => setOpen(false)} />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={kind === "expense" ? "Lançar gasto" : "Lançar entrada"}
                className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-line bg-[#0d1126] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[2rem]"
                style={{ animation: "sheet-up 220ms cubic-bezier(.2,.8,.2,1)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex rounded-2xl bg-white/5 p-1 text-sm font-semibold">
                    {(["expense", "income"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setKind(k);
                          setCategoryId("");
                        }}
                        aria-pressed={kind === k}
                        className={`rounded-xl px-4 py-2 transition-colors ${
                          kind === k
                            ? k === "expense"
                              ? "grad-primary text-white"
                              : "bg-gain/90 text-[#05201a]"
                            : "text-ink-soft"
                        }`}
                      >
                        {k === "expense" ? "Gasto" : "Entrada"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Fechar"
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-ink-soft"
                  >
                    <X size={20} aria-hidden />
                  </button>
                </div>

                <form action={action} className="mt-6 space-y-5">
                  <input type="hidden" name="type" value={kind} />
                  <input type="hidden" name="category_id" value={categoryId} />

                  <label className="block text-center">
                    <span className="text-sm text-ink-soft">Valor</span>
                    <div className="mt-1 flex items-baseline justify-center gap-2">
                      <span className="font-display text-2xl text-ink-soft">R$</span>
                      <input
                        name="amount"
                        required
                        autoFocus
                        inputMode="decimal"
                        placeholder="0,00"
                        autoComplete="off"
                        className="font-display metal-text w-48 bg-transparent text-center text-5xl font-bold outline-none placeholder:text-white/20"
                      />
                    </div>
                  </label>

                  <fieldset>
                    <legend className="text-sm text-ink-soft">Categoria</legend>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {visibleCategories.map((c) => {
                        const selected = categoryId === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setCategoryId(selected ? "" : c.id)}
                            aria-pressed={selected}
                            className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-medium transition-colors ${
                              selected
                                ? "border-cobalt bg-cobalt-soft text-ink"
                                : "border-line bg-white/[0.03] text-ink-soft"
                            }`}
                          >
                            <CategoryIcon name={c.icon} size={20} />
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm text-ink-soft">Data</span>
                      <input
                        type="date"
                        name="occurred_on"
                        defaultValue={todayISO()}
                        required
                        className="mt-1.5 w-full rounded-2xl border border-line bg-white/[0.04] px-3 py-3 text-base outline-none focus:border-cobalt"
                      />
                    </label>
                    {kind === "expense" ? (
                      <label className="block">
                        <span className="text-sm text-ink-soft">Pagou com</span>
                        <select
                          name="payment_method"
                          defaultValue="pix"
                          className="mt-1.5 w-full rounded-2xl border border-line bg-white/[0.04] px-3 py-3 text-base outline-none focus:border-cobalt"
                        >
                          {METHODS.map((m) => (
                            <option key={m.value} value={m.value} className="bg-[#0d1126]">
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div />
                    )}
                  </div>

                  <label className="block">
                    <span className="text-sm text-ink-soft">Descrição (opcional)</span>
                    <input
                      name="description"
                      maxLength={120}
                      placeholder={kind === "expense" ? "Ex.: almoço com o pessoal" : "Ex.: salário de novembro"}
                      className="mt-1.5 w-full rounded-2xl border border-line bg-white/[0.04] px-4 py-3 text-base outline-none placeholder:text-white/25 focus:border-cobalt"
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
                    className={`w-full rounded-2xl px-5 py-4 text-base font-semibold transition-opacity disabled:opacity-60 ${
                      kind === "expense" ? "grad-primary text-white" : "bg-gain text-[#05201a]"
                    }`}
                  >
                    {pending ? "Salvando…" : kind === "expense" ? "Salvar gasto" : "Salvar entrada"}
                  </button>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
