export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando estudos">
      <div className="mb-6 h-9 w-40 animate-pulse rounded-xl bg-white/[0.06]" />
      <div className="glass mb-5 h-40 animate-pulse rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass h-72 animate-pulse rounded-3xl" />
        <div className="glass h-72 animate-pulse rounded-3xl" />
      </div>
    </div>
  );
}
