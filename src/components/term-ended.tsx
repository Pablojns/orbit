import Link from "next/link";
import { CalendarX } from "lucide-react";

// Aviso quando o semestre de Estudos já acabou: as aulas param de aparecer na Agenda.
export function TermEnded({ link = true }: { link?: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-sun/30 bg-sun/[0.08] px-4 py-3 text-sm">
      <CalendarX size={18} className="shrink-0 text-sun" aria-hidden />
      <p className="flex-1">
        <strong>Semestre encerrado.</strong> As aulas não aparecem mais na agenda.
      </p>
      {link ? (
        <Link href="/app/estudos" className="shrink-0 font-semibold text-cobalt">
          Cadastrar o próximo
        </Link>
      ) : null}
    </div>
  );
}
