/* eslint-disable @next/next/no-img-element */
// Marca oficial do Dimeta (public/brand/orbit-logo.png).
export function Logo({ size = 32, withName = true }: { size?: number; withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img
        src="/brand/orbit-mark-96.png"
        width={size}
        height={size}
        alt={withName ? "" : "Dimeta"}
        className="rounded-[28%]"
      />
      {withName ? <span className="font-display text-xl font-bold">Dimeta</span> : null}
    </span>
  );
}
