// Marca do Orbit: o anel do ciclo com o "sol" de hoje.
export function Logo({ size = 28, withName = true }: { size?: number; withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="10.5" fill="none" stroke="var(--cobalt)" strokeWidth="4" />
        <circle cx="23.4" cy="8.6" r="4" fill="var(--sun)" stroke="var(--card)" strokeWidth="1.5" />
      </svg>
      {withName ? (
        <span className="font-display text-xl font-bold">Orbit</span>
      ) : (
        <span className="sr-only">Orbit</span>
      )}
    </span>
  );
}
