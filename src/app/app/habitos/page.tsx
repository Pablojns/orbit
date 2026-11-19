import { Flame } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireProfile } from "@/lib/profile";

export const metadata = { title: "Hábitos" };
export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  await requireProfile();
  return (
    <>
      <PageHeader title="Hábitos" subtitle="Pequenas coisas que você quer fazer com frequência." />
      <EmptyState
        icon={Flame}
        title="Nenhum hábito criado"
        description="Escolha um hábito e quantas vezes por semana quer fazer. Perder um dia só zera a sequência, sem punição."
      />
    </>
  );
}
