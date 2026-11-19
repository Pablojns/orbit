import Link from "next/link";
import { CalendarClock, Flame } from "lucide-react";
import { CycleRing } from "@/components/cycle-ring";
import { EmptyState } from "@/components/empty-state";
import { currentCycle } from "@/lib/cycle";
import { todayInSaoPaulo } from "@/lib/dates";
import { requireProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(
      new Date(),
    ),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function HomePage() {
  const profile = await requireProfile();
  const cycle = currentCycle(todayInSaoPaulo(), profile.cycleStartDay);
  const firstName = profile.displayName?.split(" ")[0];

  return (
    <div className="space-y-6">
      <header className="pt-8">
        <p className="text-[15px] text-ink-soft">{firstName ? `${greeting()}, ${firstName}` : greeting()}</p>
        <h1 className="mt-1 text-[2rem] leading-tight font-bold">
          Dia {cycle.dayNumber} de {cycle.totalDays} do seu ciclo
        </h1>
      </header>

      <div className="space-y-6 lg:grid lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-6 lg:space-y-0">
        <section className="rounded-[2rem] bg-card px-5 pt-7 pb-6 shadow-[0_1px_0_var(--line)]">
          <CycleRing cycle={cycle} />
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-sm text-ink-soft">Livre para gastar até o próximo ciclo</p>
            <p className="font-display mt-1 text-3xl font-bold text-ink-soft/50">R$ —</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Esse número aparece quando você lançar suas entradas e contas.{" "}
              <Link href="/app/perfil" className="font-medium text-cobalt underline-offset-2 hover:underline">
                Seu ciclo começa no dia {profile.cycleStartDay}
              </Link>
              .
            </p>
          </div>
        </section>

        <div className="space-y-4">
          <EmptyState
            icon={CalendarClock}
            title="Nenhum prazo chegando"
            description="Provas, compromissos e contas dos próximos 14 dias vão aparecer aqui, com contagem regressiva."
          />
          <EmptyState
            icon={Flame}
            title="Nenhum hábito para hoje"
            description="Os hábitos que você criar aparecem aqui para marcar com um toque."
          />
        </div>
      </div>
    </div>
  );
}
