// Retorno imediato ao trocar de aba enquanto a página carrega.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <div className="mb-6 h-9 w-40 animate-pulse rounded-xl bg-white/[0.06]" />
      <div className="glass h-48 animate-pulse rounded-3xl" />
      <div className="glass mt-5 h-72 animate-pulse rounded-3xl" />
    </div>
  );
}
