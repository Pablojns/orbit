import { Check, Plus, X } from "lucide-react";
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "@/app/app/actions";
import type { ChecklistItem } from "@/lib/routine";

// Passos dentro de um item da agenda ("cap. 1", "lista de exercícios"…).
// Abre pelo ícone de passos no fim da linha (ver ItemShell).
export function ChecklistPanel({
  parentType,
  parentId,
  items,
}: {
  parentType: "event" | "task";
  parentId: string;
  items: ChecklistItem[];
}) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-3">
      {items.length ? (
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-2">
              <form action={toggleChecklistItem}>
                <input type="hidden" name="id" value={it.id} />
                <input type="hidden" name="done" value={String(it.done)} />
                <button
                  type="submit"
                  aria-label={it.done ? `Desmarcar ${it.text}` : `Marcar ${it.text}`}
                  className={`grid h-5 w-5 place-items-center rounded-md border ${
                    it.done ? "border-gain bg-gain text-[#0b1440]" : "border-white/25 text-transparent"
                  }`}
                >
                  <Check size={12} strokeWidth={3} aria-hidden />
                </button>
              </form>
              <span className={`min-w-0 flex-1 truncate text-[13px] ${it.done ? "text-ink-soft line-through" : ""}`}>
                {it.text}
              </span>
              <form action={deleteChecklistItem}>
                <input type="hidden" name="id" value={it.id} />
                <button
                  type="submit"
                  aria-label={`Tirar ${it.text}`}
                  className="grid h-6 w-6 place-items-center rounded-full text-ink-soft hover:text-loss"
                >
                  <X size={12} aria-hidden />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      <form action={addChecklistItem} className={`${items.length ? "mt-2 " : ""}flex items-center gap-2`}>
        <input type="hidden" name="parent_type" value={parentType} />
        <input type="hidden" name="parent_id" value={parentId} />
        <input
          name="text"
          required
          maxLength={120}
          placeholder="Novo passo, ex.: estudar capítulo 2"
          aria-label="Novo passo"
          className="min-w-0 flex-1 rounded-xl border border-line bg-white/[0.04] px-3 py-1.5 text-[13px] outline-none placeholder:text-white/25 focus:border-cobalt"
        />
        <button
          type="submit"
          aria-label="Adicionar passo"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cobalt/20 text-cobalt"
        >
          <Plus size={15} aria-hidden />
        </button>
      </form>
    </div>
  );
}
