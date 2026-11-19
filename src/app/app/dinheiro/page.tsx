import { CreditCard, PiggyBank, Receipt, Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireProfile } from "@/lib/profile";

export const metadata = { title: "Dinheiro" };
export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  await requireProfile();
  return (
    <>
      <PageHeader title="Dinheiro" subtitle="Entradas, gastos, cartões e contas do seu ciclo." />
      <div className="space-y-4">
        <EmptyState
          icon={Wallet}
          title="Nenhuma movimentação ainda"
          description="Cada gasto e cada entrada que você lançar aparece aqui, separado por categoria."
        />
        <EmptyState
          icon={CreditCard}
          title="Nenhum cartão cadastrado"
          description="Com o cartão cadastrado, cada parcela cai sozinha na fatura certa."
        />
        <EmptyState
          icon={Receipt}
          title="Nenhuma conta fixa"
          description="Aluguel, luz, internet: cadastre uma vez e marque como paga todo mês."
        />
        <EmptyState
          icon={PiggyBank}
          title="Reserva de emergência"
          description="Defina quanto quer guardar e acompanhe o quanto falta."
        />
      </div>
    </>
  );
}
