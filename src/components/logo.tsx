/* eslint-disable @next/next/no-img-element */
// Marca oficial do Orbit (public/brand/orbit-logo.png).
export function Logo({ size = 32, withName = true }: { size?: number; withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img
        src="/brand/orbit-mark-96.png"
        width={size}
        height={size}
        alt={withName ? "" : "Orbit"}
        className="rounded-[28%]"
      />
      {withName ? <span className="font-display text-xl font-bold">Orbit</span> : null}
    </span>
  );
}
