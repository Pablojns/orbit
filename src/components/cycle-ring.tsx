import type { Cycle } from "@/lib/cycle";
import { formatShort } from "@/lib/dates";

// O elemento-assinatura do Orbit: o ciclo financeiro desenhado como uma órbita.
// O ponto âmbar é "hoje", andando do dia do salário até a véspera do próximo.
export function CycleRing({ cycle }: { cycle: Cycle }) {
  const size = 232;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = cycle.dayNumber / cycle.totalDays;
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  const cx = size / 2 + r * Math.cos(angle);
  const cy = size / 2 + r * Math.sin(angle);

  return (
    <figure className="relative mx-auto w-fit">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Dia ${cycle.dayNumber} de ${cycle.totalDays} do seu ciclo`}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--cobalt)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ ["--ring-length" as string]: c, animation: "orbit-draw 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
        <circle cx={cx} cy={cy} r={11} fill="var(--sun)" stroke="var(--card)" strokeWidth={4} />
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-[3.25rem] leading-none font-bold">{cycle.daysLeft}</span>
        <span className="mt-1 text-sm text-ink-soft">
          {cycle.daysLeft === 1 ? "dia até o próximo ciclo" : "dias até o próximo ciclo"}
        </span>
        <span className="mt-3 rounded-full bg-sky px-3 py-1 text-xs font-medium text-ink-soft">
          {formatShort(cycle.start)} a {formatShort(cycle.end)}
        </span>
      </figcaption>
    </figure>
  );
}
