// Prévia ilustrativa do Início (valores de exemplo, não são dados reais).
export function PhonePreview() {
  return (
    <figure className="relative mx-auto w-[300px] shrink-0">
      <div className="rounded-[2.75rem] border-[10px] border-[#1a2147] bg-[#070b1f] px-4 pt-7 pb-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]">
        <p className="text-lg font-extrabold">Boa tarde, Ana</p>
        <p className="text-[11px] font-semibold text-ink-soft">
          Terça, 24 de novembro
        </p>
        <div className="hero-card mt-3 rounded-[20px] p-4">
          <p className="text-[11px] font-bold text-[#b9c2f5]">Saldo</p>
          <p className="text-[30px] leading-tight font-extrabold tracking-[-0.03em]">
            R$ 1.184,30
          </p>
          <div className="mt-2 flex gap-2">
            <div className="flex-1 rounded-xl bg-white/[0.08] px-2.5 py-2">
              <p className="text-[10px] text-[#c7cff7]">Pode gastar</p>
              <p className="text-[13px] font-extrabold">R$ 107,66/dia</p>
            </div>
            <div className="flex-1 rounded-xl bg-white/[0.08] px-2.5 py-2">
              <p className="text-[10px] text-[#c7cff7]">Até o salário</p>
              <p className="text-[13px] font-extrabold">faltam 11 dias</p>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-[20px] border border-[#a78bfa]/45 bg-[#121a45] p-3">
          <p className="text-sm font-extrabold">Agenda</p>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#2a2158] p-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#4b3a9e] text-xs font-extrabold">
              27
            </span>
            <span className="flex-1 text-xs font-bold">
              Prova de Estatística
            </span>
            <span className="rounded-full bg-[#3a2d80] px-2 py-0.5 text-[10px] font-bold text-[#d9ccff]">
              em 3 dias
            </span>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-ink-soft">
        Tela ilustrativa, com valores de exemplo.
      </figcaption>
    </figure>
  );
}
