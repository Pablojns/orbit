import { loadExtrato } from "@/app/app/actions";
import { MoneyStrip } from "@/components/money-strip";
import { QuickAdd } from "@/components/quick-add";
import { todayInSaoPaulo } from "@/lib/dates";
import { getFinance } from "@/lib/finance";
import { requireProfile } from "@/lib/profile";
import { ExtratoView } from "./extrato-view";

export const metadata = { title: "Extrato" };
export const dynamic = "force-dynamic";

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  const { periodo = "ciclo", de, ate } = await searchParams;
  const profile = await requireProfile();
  const [f, initial] = await Promise.all([getFinance(profile.cycleStartDay), loadExtrato(periodo, de, ate)]);
  const s = f.summary;

  return (
    <>
      <MoneyStrip balanceCents={s.balanceCents} openStatementCents={s.openStatementCents} hasCards={f.cards.length > 0} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <QuickAdd categories={f.categories} cards={f.cards} variant="expense" />
        <QuickAdd categories={f.categories} cards={f.cards} variant="income" />
      </div>
      <ExtratoView initial={initial} today={todayInSaoPaulo()} categories={f.categories} cards={f.cards} />
    </>
  );
}
