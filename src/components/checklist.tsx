import { Check, ListChecks, Plus, X } from "lucide-react";
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "@/app/app/actions";
import type { ChecklistItem } from "@/lib/routine";

// Passos dentro de uma prova ou tarefa ("cap. 1", "lista de exercícios"…).
export function Checklist({
  parentType,
  parentId,
  items,
}: {
  parentType: "event" | "task";
  parentId: string;
  items: ChecklistItem[];
}) {
  const done = items.filter((i) => i.done).length;
  return (
    <details className="group mt-1.5">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-ink-soft hover:text-ink">
        <ListChecks size={13} aria-hidden />
        {items.length ? `${done}/${items.length} passos` : "Adicionar passos"}
      </summary>
      <ul className="mt-2 space-y-1">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2">
            <form action={toggleChecklistItem}>
              <input type="hidden" name="id" value={it.id} />
              <input type="hidden" name="done" value={String(it.done)} />
              <button
                type="submit"
                aria-label={it.done ? `Desmarcar ${it.text}` : `Marcar ${it.text}`}
                className={`grid h-5 w-5 place-items-center rounded-md border ${
                  it.done ? "border-gain bg-gain text-[#05201a]" : "border-white/25 text-transparent"
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
      <form action={addChecklistItem} className="mt-2 flex items-center gap-2">
        <input type="hidden" name="parent_type" value={parentType} />
        <input type="hidden" name="parent_id" value={parentId} />
        <input
          name="text"
          required
          maxLength={120}
          placeholder="Ex.: estudar capítulo 2"
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
    </details>
  );
}
