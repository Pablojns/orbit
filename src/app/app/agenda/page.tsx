import { CalendarDays, Check, ListTodo, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { EventRow } from "@/components/event-row";
import { Field, Select, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import { PageHeader } from "@/components/page-header";
import { deleteTask, saveEvent, saveTask, toggleTask } from "@/app/app/actions";
import { getAgenda } from "@/lib/routine";

export const metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

const PRIORITY = {
  1: { label: "Alta", tone: "bg-loss/15 text-loss" },
  2: { label: "Média", tone: "bg-sun/20 text-sun" },
  3: { label: "Baixa", tone: "bg-white/[0.06] text-ink-soft" },
} as Record<number, { label: string; tone: string }>;

export default async function AgendaPage() {
  const a = await getAgenda();
  const openTasks = a.tasks.filter((t) => !t.done);
  const doneTasks = a.tasks.filter((t) => t.done);

  return (
    <>
      <PageHeader title="Agenda" subtitle="Provas, compromissos, prazos e tarefas." />
      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Próximos prazos</h2>
            <FormSheet title="Novo prazo" trigger="Prazo" submitLabel="Salvar prazo" action={saveEvent}>
              <Field label="O que é">
                <TextInput name="title" required maxLength={80} placeholder="Ex.: Prova de Estatística" />
              </Field>
              <Field label="Tipo">
                <Select
                  name="kind"
                  defaultValue="exam"
                  options={[
                    { value: "exam", label: "Prova" },
                    { value: "appointment", label: "Compromisso" },
                    { value: "deadline", label: "Prazo / entrega" },
                    { value: "bill", label: "Conta / boleto" },
                    { value: "other", label: "Outro" },
                  ]}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data">
                  <TextInput name="date" type="date" required />
                </Field>
                <Field label="Hora (opcional)">
                  <TextInput name="time" type="time" />
                </Field>
              </div>
              <Field label="Anotação (opcional)">
                <TextInput name="notes" maxLength={500} placeholder="Ex.: levar documento, sala 12" />
              </Field>
            </FormSheet>
          </div>

          {a.overdue.length ? (
            <ul className="glass mt-3 divide-y divide-white/[0.06] rounded-[1.75rem] border border-loss/20 px-5">
              {a.overdue.map((e) => (
                <EventRow key={e.id} e={e} />
              ))}
            </ul>
          ) : null}

          {a.upcoming.length ? (
            <ul className="glass mt-3 divide-y divide-white/[0.06] rounded-[1.75rem] px-5">
              {a.upcoming.map((e) => (
                <EventRow key={e.id} e={e} />
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              <EmptyState
                icon={CalendarDays}
                title="Nenhum prazo chegando"
                description="Cadastre provas, entregas e compromissos. Os mais próximos aparecem no Início com contagem regressiva."
              />
            </div>
          )}

          {a.done.length ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-ink-soft">Concluídos recentes ({a.done.length})</summary>
              <ul className="glass mt-2 divide-y divide-white/[0.06] rounded-[1.75rem] px-5">
                {a.done.map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
              </ul>
            </details>
          ) : null}
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Tarefas</h2>
            <FormSheet
              title="Nova tarefa"
              trigger="Tarefa"
              submitLabel="Salvar tarefa"
              action={saveTask}
              variant="glass"
            >
              <Field label="Tarefa">
                <TextInput name="title" required maxLength={120} placeholder="Ex.: Enviar atividade de extensão" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prioridade">
                  <Select
                    name="priority"
                    defaultValue="2"
                    options={[
                      { value: "1", label: "Alta" },
                      { value: "2", label: "Média" },
                      { value: "3", label: "Baixa" },
                    ]}
                  />
                </Field>
                <Field label="Para quando (opcional)">
                  <TextInput name="due_on" type="date" />
                </Field>
              </div>
            </FormSheet>
          </div>

          {a.tasks.length ? (
            <ul className="glass mt-3 divide-y divide-white/[0.06] rounded-[1.75rem] px-5">
              {[...openTasks, ...doneTasks].map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <form action={toggleTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="done" value={String(t.done)} />
                    <button
                      type="submit"
                      aria-label={t.done ? `Reabrir ${t.title}` : `Concluir ${t.title}`}
                      className={`grid h-7 w-7 place-items-center rounded-lg border ${
                        t.done
                          ? "border-gain bg-gain text-[#05201a]"
                          : "border-white/25 text-transparent hover:text-ink-soft"
                      }`}
                    >
                      <Check size={15} strokeWidth={3} aria-hidden />
                    </button>
                  </form>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[15px] ${t.done ? "text-ink-soft line-through" : ""}`}>{t.title}</p>
                    {t.dueOn ? (
                      <p className="text-[13px] text-ink-soft">
                        Até{" "}
                        {new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })
                          .format(new Date(`${t.dueOn}T12:00:00Z`))
                          .replace(".", "")}
                      </p>
                    ) : null}
                  </div>
                  {!t.done ? (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY[t.priority].tone}`}>
                      {PRIORITY[t.priority].label}
                    </span>
                  ) : null}
                  <form action={deleteTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      aria-label={`Excluir ${t.title}`}
                      className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:text-loss"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              <EmptyState
                icon={ListTodo}
                title="Nenhuma tarefa"
                description="Anote o que precisa fazer, com prioridade e data se quiser."
              />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
