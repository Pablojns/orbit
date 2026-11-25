// Cabeçalho das telas no visual da Rodada 3: título forte e uma linha de apoio.
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 pt-5 pb-5 lg:pt-7">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight lg:text-[28px]">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-[13px] font-semibold text-ink-soft lg:text-sm">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}
