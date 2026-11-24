"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Bloqueio quando o teste grátis termina ou o pagamento não entrou (só com BILLING_ENABLED).
// Assinatura e Perfil continuam abertos (para pagar e exportar os dados).
export function AccessGate({
  blocked,
  reason,
}: {
  blocked: boolean;
  reason: string;
}) {
  const pathname = usePathname();
  if (
    !blocked ||
    pathname.startsWith("/app/assinatura") ||
    pathname.startsWith("/app/perfil")
  )
    return null;
  return (
    <div className="app-vars fixed inset-0 z-40 grid place-items-center bg-[#070b1f]/95 p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Assinatura"
        className="w-full max-w-md rounded-3xl border border-white/[0.07] bg-[#0f1634] p-6 text-center"
      >
        <h2 className="text-xl font-extrabold">{reason}</h2>
        <p className="mt-2 text-[15px] text-ink-soft">
          Seus dados estão guardados. Assine para continuar de onde parou.
        </p>
        <Link
          href="/app/assinatura"
          className="grad-primary mt-5 flex h-12 items-center justify-center rounded-2xl text-base font-bold text-white"
        >
          Ver assinatura
        </Link>
        <Link
          href="/app/perfil"
          className="mt-3 block text-sm font-bold text-[#a78bfa]"
        >
          Exportar meus dados
        </Link>
      </div>
    </div>
  );
}
