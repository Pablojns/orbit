import type { Cycle } from "@/lib/cycle";

// Anel do ciclo (versão do app): trilho metálico, progresso em degradê e o
// "sol" de hoje com brilho. O conteúdo do centro vem de quem usa o componente.
export function OrbitRing({ cycle, size = 248, children }: { cycle: Cycle; size?: number; children: React.ReactNode }) {
  const stroke = 12;
  const r = (size - stroke - 16) / 2;
  const c = 2 * Math.PI * r;
  const progress = Math.min(1, cycle.dayNumber / cycle.totalDays);
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  const mid = size / 2;
  const cx = mid + r * Math.cos(angle);
  const cy = mid + r * Math.sin(angle);

  return (
    <figure className="relative mx-auto" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Dia ${cycle.dayNumber} de ${cycle.totalDays} do seu ciclo`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="orbit-progress" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3cc8ff" />
            <stop offset="50%" stopColor="#7a6cff" />
            <stop offset="100%" stopColor="#b05cff" />
          </linearGradient>
          <linearGradient id="orbit-track" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.14)" />
          </linearGradient>
          <radialGradient id="orbit-sun" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fff4cf" />
            <stop offset="45%" stopColor="#ffc65c" />
            <stop offset="100%" stopColor="#e5822f" />
          </radialGradient>
          <filter id="orbit-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <circle cx={mid} cy={mid} r={r} fill="none" stroke="url(#orbit-track)" strokeWidth={stroke} />
        <circle
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          stroke="url(#orbit-progress)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          transform={`rotate(-90 ${mid} ${mid})`}
          style={{ ["--ring-length" as string]: c, animation: "orbit-draw 1100ms cubic-bezier(.2,.8,.2,1)" }}
        />
        <circle cx={cx} cy={cy} r={14} fill="#ffb648" opacity={0.55} filter="url(#orbit-glow)" />
        <circle cx={cx} cy={cy} r={10} fill="url(#orbit-sun)" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} />
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        {children}
      </figcaption>
    </figure>
  );
}
