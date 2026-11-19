import { CalendarDays, ListTodo } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireProfile } from "@/lib/profile";

export const metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  await requireProfile();
  return (
    <>
      <PageHeader title="Agenda" subtitle="Provas, compromissos e tarefas." />
      <div className="space-y-4">
        <EmptyState
          icon={CalendarDays}
          title="Agenda vazia"
          description="Cadastre provas e compromissos para ver tudo dos próximos dias numa lista só."
        />
        <EmptyState
          icon={ListTodo}
          title="Nenhuma tarefa"
          description="Tarefas com prioridade e data aparecem aqui, das mais urgentes para as outras."
        />
      </div>
    </>
  );
}
