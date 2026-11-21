export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="pt-4 pb-5 lg:pt-6">
      <h1 className="text-[2rem] leading-none font-bold">{title}</h1>
      {subtitle ? <p className="mt-2 text-[15px] text-ink-soft">{subtitle}</p> : null}
    </header>
  );
}
