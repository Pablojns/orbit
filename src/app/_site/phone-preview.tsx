import { CycleRing } from "@/components/cycle-ring";
import type { Cycle } from "@/lib/cycle";

// Prévia ilustrativa do app (valores de exemplo, não são dados reais).
const DEMO: Cycle = {
  start: { year: 2026, month: 10, day: 30 },
  end: { year: 2026, month: 11, day: 29 },
  dayNumber: 21,
  totalDays: 31,
  daysLeft: 10,
};

export function PhonePreview() {
  return (
    <figure className="relative mx-auto w-[300px] shrink-0">
      <div className="rounded-[2.75rem] border-[10px] border-ink bg-sky px-4 pt-8 pb-6 shadow-[0_30px_60px_-30px_rgba(27,31,59,0.55)]">
        <p className="text-xs text-ink-soft">Boa tarde</p>
        <p className="font-display mt-0.5 text-xl leading-tight font-bold">Dia 21 de 31 do seu ciclo</p>
        <div className="mt-4 rounded-[1.75rem] bg-card px-3 pt-5 pb-4">
          <div className="origin-top scale-[0.82]">
            <CycleRing cycle={DEMO} />
          </div>
          <div className="-mt-8 border-t border-line pt-3">
            <p className="text-xs text-ink-soft">Livre para gastar até o próximo ciclo</p>
            <p className="font-display text-2xl font-bold">R$ 640,00</p>
            <p className="mt-1 text-xs text-ink-soft">Já descontados R$ 1.180,00 de fatura e contas</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-card px-3 py-2.5 text-xs">
          <span className="font-medium">Prova de Estatística</span>
          <span className="rounded-full bg-sun/25 px-2 py-0.5 font-semibold text-ink">em 3 dias</span>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-ink-soft">
        Tela ilustrativa, com valores de exemplo.
      </figcaption>
    </figure>
  );
}
