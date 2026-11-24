import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { listPayments } from "@/lib/asaas";
import { BILLING_ENABLED } from "@/lib/flags";
import { formatCents } from "@/lib/money";
import { getAccess } from "@/lib/subscription";
import { cancel } from "./actions";
import { SubscribeForm } from "./subscribe-form";

export const metadata = { title: "Assinatura" };
export const dynamic = "force-dynamic";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));

export default async function SubscriptionPage() {
  if (!BILLING_ENABLED) {
    return (
      <>
        <PageHeader
          title="Assinatura"
          subtitle="7 dias grátis, depois R$ 29,90 por mês."
        />
        <section className="glass rounded-3xl p-5 text-[15px] text-ink-soft">
          A cobrança está desligada: o Dimeta está em modo de teste. Ela liga
          quando BILLING_ENABLED for ativado.
        </section>
      </>
    );
  }
  const { access, sub } = await getAccess();
  let payments: Awaited<ReturnType<typeof listPayments>> = [];
  if (sub?.providerSubscriptionId) {
    try {
      payments = await listPayments(sub.providerSubscriptionId);
    } catch {
      payments = [];
    }
  }
  return (
    <>
      <PageHeader
        title="Assinatura"
        subtitle="7 dias grátis, depois R$ 29,90 por mês. Sem fidelidade."
      />
      <section className="hero-card rounded-3xl p-[22px]">
        <p className="text-[13px] font-bold text-[#b9c2f5]">Situação</p>
        <p className="mt-1 text-2xl font-extrabold">
          {access.kind === "trial"
            ? `Teste grátis: ${access.daysLeft} ${access.daysLeft === 1 ? "dia" : "dias"} restantes`
            : access.kind === "active"
              ? sub?.status === "canceled"
                ? `Cancelada, acesso até ${access.until ? fmt(access.until) : "o fim do mês pago"}`
                : `Ativa${access.until ? `, renova em ${fmt(access.until)}` : ""}`
              : access.kind === "grace"
                ? `Pagamento atrasado, acesso até ${fmt(access.until)}`
                : access.reason === "trial_over"
                  ? "O teste grátis terminou"
                  : access.reason === "canceled"
                    ? "Assinatura cancelada"
                    : "Pagamento pendente"}
        </p>
      </section>

      {access.kind !== "active" || sub?.status === "canceled" ? (
        <section className="glass mt-5 rounded-3xl p-5">
          <h2 className="text-lg">Assinar</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Seus dados continuam guardados mesmo com o acesso bloqueado. Ao
            pagar, tudo volta como estava.
          </p>
          <SubscribeForm />
        </section>
      ) : (
        <section className="glass mt-5 rounded-3xl p-5">
          <h2 className="text-lg">Cancelar</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Para as próximas cobranças. Você usa até o fim do mês já pago, e
            seus dados ficam guardados. Dá para exportar tudo em Perfil.
          </p>
          <form action={cancel} className="mt-3">
            <button
              type="submit"
              className="h-11 rounded-xl border border-loss/50 px-4 text-sm font-bold text-loss hover:bg-loss/10"
            >
              Cancelar assinatura
            </button>
          </form>
        </section>
      )}

      {payments.length ? (
        <section className="glass mt-5 rounded-3xl p-5">
          <h2 className="text-lg">Cobranças e recibos</h2>
          <ul className="mt-2">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 border-t border-white/[0.07] py-2.5 first:border-t-0"
              >
                <span className="text-[15px]">
                  {fmt(`${p.dueDate}T12:00:00-03:00`)} ·{" "}
                  {formatCents(Math.round(p.value * 100))}
                </span>
                <a
                  href={p.transactionReceiptUrl ?? p.invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold text-[#a78bfa]"
                >
                  {p.transactionReceiptUrl ? "Recibo" : "Pagar"}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="mt-5 text-sm text-ink-soft">
        Dúvidas sobre cobrança e dados: veja os{" "}
        <Link href="/termos" className="underline">
          Termos
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" className="underline">
          Privacidade
        </Link>
        .
      </p>
    </>
  );
}
