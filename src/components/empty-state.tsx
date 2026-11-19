import type { LucideIcon } from "lucide-react";

// Tela vazia: diz o que vai aparecer aqui e o que fazer para isso acontecer.
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-dashed border-line bg-card/60 px-5 py-6">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cobalt-soft text-cobalt">
          <Icon size={22} aria-hidden />
        </span>
        <div>
          <h2 className="text-lg leading-tight font-semibold">{title}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{description}</p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
