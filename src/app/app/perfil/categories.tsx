import { X } from "lucide-react";
import { archiveCategory, saveCategory } from "@/app/app/actions";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/components/category-icon";
import { Field, Select, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import type { Category } from "@/lib/finance";

function Chips({ list }: { list: Category[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {list.map((c) => (
        <li key={c.id} className="flex items-center gap-2 rounded-full bg-white/[0.05] py-1.5 pr-1.5 pl-3 text-sm">
          <CategoryIcon name={c.icon ?? "circle"} size={15} />
          {c.name}
          <form action={archiveCategory}>
            <input type="hidden" name="id" value={c.id} />
            <button
              type="submit"
              aria-label={`Remover categoria ${c.name}`}
              className="grid h-6 w-6 place-items-center rounded-full text-ink-soft hover:bg-loss/15 hover:text-loss"
            >
              <X size={13} aria-hidden />
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}

export function CategoriesSection({ categories }: { categories: Category[] }) {
  const expense = categories.filter((c) => c.kind === "expense");
  const income = categories.filter((c) => c.kind === "income");
  return (
    <section className="glass mt-5 rounded-[1.75rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Categorias</h2>
          <p className="text-sm text-ink-soft">Remover não apaga os lançamentos antigos.</p>
        </div>
        <FormSheet
          title="Nova categoria"
          trigger="Nova"
          submitLabel="Criar categoria"
          action={saveCategory}
          variant="glass"
        >
          <Field label="Nome">
            <TextInput name="name" required maxLength={40} placeholder="Ex.: Pet, Academia, Viagem" />
          </Field>
          <Field label="É de">
            <Select
              name="kind"
              defaultValue="expense"
              options={[
                { value: "expense", label: "Gasto" },
                { value: "income", label: "Entrada" },
              ]}
            />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Ícone</legend>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-7">
              {CATEGORY_ICON_NAMES.map((icon, i) => (
                <label key={icon} className="cursor-pointer">
                  <input type="radio" name="icon" value={icon} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="grid aspect-square place-items-center rounded-xl bg-white/[0.05] text-ink-soft transition peer-checked:bg-cobalt/25 peer-checked:text-white peer-checked:ring-1 peer-checked:ring-cobalt peer-focus-visible:ring-2 peer-focus-visible:ring-cobalt">
                    <CategoryIcon name={icon} size={18} />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </FormSheet>
      </div>
      <p className="mt-4 mb-2 text-sm font-semibold text-ink-soft">Gastos</p>
      <Chips list={expense} />
      <p className="mt-4 mb-2 text-sm font-semibold text-ink-soft">Entradas</p>
      <Chips list={income} />
    </section>
  );
}
