import Link from "next/link";
import { CalendarClock, CreditCard, Flame, Laptop, PiggyBank, Smartphone } from "lucide-react";
import { Logo } from "@/components/logo";
import { PhonePreview } from "./_site/phone-preview";
import { SiteFooter } from "./_site/site-footer";

export const metadata = {
  title: { absolute: "Dimeta · Saiba quanto você pode gastar até o próximo salário" },
  description:
    "Dinheiro, cartões, prazos e hábitos organizados pelo seu ciclo, do dia do salário até o próximo. No celular ou no computador.",
};

const PAINS = [
  {
    title: "O salário entra e some",
    text: "No dia 10 você já não sabe para onde foi metade do dinheiro.",
  },
  {
    title: "A fatura chega de surpresa",
    text: "As parcelas de três meses atrás caem todas juntas, e o mês que parecia folgado aperta.",
  },
  {
    title: "Prazo importante passa batido",
    text: "Prova, boleto, renovação: estava anotado em algum lugar que você não abriu.",
  },
];

const STEPS = [
  {
    title: "Diga o dia em que seu dinheiro entra",
    text: "O Dimeta organiza tudo pelo seu ciclo, do dia do salário até a véspera do próximo, e não pelo mês do calendário.",
  },
  {
    title: "Lance gastos em dois toques",
    text: "Valor, categoria, pronto. Compras no cartão já entram parceladas na fatura certa.",
  },
  {
    title: "Veja quanto sobra de verdade",
    text: "O que entrou, menos o que saiu, menos faturas e contas que ainda vão vencer no ciclo.",
  },
];

const FEATURES = [
  {
    icon: CreditCard,
    title: "Cartões e parcelas",
    text: "Fechamento, vencimento e limite. Cada parcela aparece na fatura em que vai cair.",
  },
  {
    icon: PiggyBank,
    title: "Reserva de emergência",
    text: "Defina quanto quer guardar e veja quanto falta, ciclo após ciclo.",
  },
  {
    icon: CalendarClock,
    title: "Prazos com contagem regressiva",
    text: "Provas, compromissos e contas dos próximos dias numa lista só.",
  },
  {
    icon: Flame,
    title: "Hábitos sem culpa",
    text: "Marque com um toque. Perder um dia só zera a sequência, sem punição.",
  },
];

const FAQ = [
  {
    q: "O Dimeta se conecta com meu banco?",
    a: "Ainda não. Você lança os gastos, o que leva poucos segundos e te faz enxergar cada compra. A conexão automática com bancos está nos planos para depois do lançamento.",
  },
  {
    q: "Funciona no computador?",
    a: "Sim. O Dimeta abre em qualquer navegador e pode ser instalado no celular como um app. A conta é a mesma: o que você lança no celular aparece no computador.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Cada conta só enxerga os próprios dados, e essa regra é aplicada direto no banco de dados. O Dimeta não pede senha de banco nem de cartão.",
  },
  {
    q: "Preciso pagar para começar?",
    a: "Não. Você abre o Dimeta e usa o plano gratuito pelo tempo que quiser.",
  },
  {
    q: "Quanto vai custar?",
    a: "O plano gratuito tem o essencial. O Premium vai custar R$ 19,90 por mês e chega em breve; até lá, tudo é gratuito.",
  },
];

export default function SitePage() {
  return (
    <div className="bg-sky">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2 text-[15px]">
          <Link href="/app" className="rounded-2xl bg-ink px-4 py-2 font-semibold text-white">
            Abrir o Dimeta
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pt-8 pb-20 lg:grid-cols-[1.2fr_1fr] lg:pt-16 lg:pb-28">
          <div>
            <h1 className="max-w-[14ch] text-[3rem] leading-[0.98] font-bold sm:text-[4.25rem]">
              Saiba quanto você pode gastar até o próximo salário.
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-ink-soft">
              O Dimeta junta seu dinheiro, seus cartões, seus prazos e seus hábitos, e organiza tudo pelo dia em que o
              seu dinheiro entra.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/app"
                className="rounded-2xl bg-cobalt px-6 py-3.5 text-center text-base font-semibold text-white"
              >
                Abrir o Dimeta
              </Link>
              <p className="text-sm text-ink-soft">Funciona no navegador do celular e do computador.</p>
            </div>
          </div>
          <PhonePreview />
        </section>

        {/* Problema */}
        <section className="border-y border-line bg-card">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
            <h2 className="max-w-[20ch] text-3xl leading-tight font-bold sm:text-4xl">
              Planilha você abandona em duas semanas. O problema continua.
            </h2>
            <dl className="mt-10 grid gap-8 md:grid-cols-3">
              {PAINS.map((p) => (
                <div key={p.title} className="border-t-2 border-ink pt-4">
                  <dt className="text-lg font-semibold">{p.title}</dt>
                  <dd className="mt-2 leading-relaxed text-ink-soft">{p.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Como funciona */}
        <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
          <h2 className="text-3xl leading-tight font-bold sm:text-4xl">Como funciona</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span
                  aria-hidden
                  className="font-display grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cobalt text-lg font-bold text-white"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg leading-snug font-semibold">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Funcionalidades */}
        <section className="mx-auto max-w-6xl px-6 pb-16 lg:pb-24">
          <h2 className="max-w-[22ch] text-3xl leading-tight font-bold sm:text-4xl">
            O dinheiro no centro, a rotina em volta.
          </h2>
          <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cobalt-soft text-cobalt">
                  <Icon size={22} aria-hidden />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-1 leading-relaxed text-ink-soft">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Celular e computador */}
        <section className="mx-auto max-w-6xl px-6 pb-16 lg:pb-24">
          <div className="grid gap-8 rounded-[2rem] bg-cobalt px-7 py-10 text-white md:grid-cols-[1.3fr_1fr] md:items-center md:px-12 md:py-14">
            <div>
              <h2 className="text-3xl leading-tight font-bold sm:text-4xl">Celular sem bateria? Abre no computador.</h2>
              <p className="mt-4 max-w-[48ch] text-lg leading-relaxed text-white/80">
                O Dimeta funciona no navegador de qualquer aparelho, e no celular dá para instalar com ícone na tela
                inicial. Sem loja de apps e sem ocupar espaço.
              </p>
            </div>
            <ul className="space-y-3 text-[15px]">
              <li className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                <Smartphone size={20} aria-hidden /> Android e iPhone, instalado como app
              </li>
              <li className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                <Laptop size={20} aria-hidden /> Computador, direto no navegador
              </li>
            </ul>
          </div>
        </section>

        {/* Planos */}
        <section className="mx-auto max-w-6xl px-6 pb-16 lg:pb-24">
          <h2 className="text-3xl leading-tight font-bold sm:text-4xl">Planos</h2>
          <p className="mt-3 max-w-[56ch] text-ink-soft">
            Comece de graça. O Premium chega em breve; até lá, você usa tudo sem pagar.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-[2rem] border border-line bg-card p-7">
              <h3 className="text-xl font-semibold">Gratuito</h3>
              <p className="font-display mt-3 text-4xl font-bold">R$ 0</p>
              <ul className="mt-6 space-y-2.5 text-[15px] text-ink-soft">
                <li>Ciclo financeiro e painel “livre para gastar”</li>
                <li>Entradas, gastos e categorias</li>
                <li>1 cartão de crédito</li>
                <li>Agenda de prazos e até 3 hábitos</li>
              </ul>
            </article>
            <article className="rounded-[2rem] border-2 border-ink bg-card p-7">
              <h3 className="text-xl font-semibold">
                Premium{" "}
                <span className="ml-1 rounded-full bg-sun/30 px-2 py-0.5 align-middle text-xs font-semibold">
                  em breve
                </span>
              </h3>
              <p className="font-display mt-3 text-4xl font-bold">
                R$ 19,90<span className="text-lg font-medium text-ink-soft">/mês</span>
              </p>
              <ul className="mt-6 space-y-2.5 text-[15px] text-ink-soft">
                <li>Tudo do Gratuito</li>
                <li>Cartões, metas e hábitos ilimitados</li>
                <li>Resumo semanal e relatório de cada ciclo</li>
                <li>Exportar seus dados quando quiser</li>
              </ul>
            </article>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-line bg-card">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_1.6fr] lg:py-24">
            <h2 className="text-3xl leading-tight font-bold sm:text-4xl">Perguntas frequentes</h2>
            <div className="divide-y divide-line border-y border-line">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                    {item.q}
                    <span
                      aria-hidden
                      className="text-2xl leading-none text-cobalt transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
            <h2 className="max-w-[18ch] text-3xl leading-tight font-bold sm:text-5xl">
              Descubra hoje quanto você pode gastar até o próximo salário.
            </h2>
            <p className="mt-4 max-w-[48ch] text-lg text-white/75">Abra no celular ou no computador. É grátis.</p>
            <Link
              href="/app"
              className="mt-8 inline-block rounded-2xl bg-sun px-6 py-3.5 text-base font-semibold text-ink"
            >
              Abrir o Dimeta
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
