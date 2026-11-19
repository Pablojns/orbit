// Aparece na hora enquanto o mês carrega, em vez de a tela ficar parada.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando agenda">
      <div className="mb-6 h-9 w-40 animate-pulse rounded-xl bg-white/[0.06]" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="glass h-80 animate-pulse rounded-[1.75rem]" />
        <div className="glass h-[34rem] animate-pulse rounded-[1.75rem]" />
      </div>
    </div>
  );
}
