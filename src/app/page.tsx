import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  Check,
  CreditCard,
  Mic,
  PiggyBank,
  Repeat,
  Smartphone,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { AUTH_ENABLED } from "@/lib/flags";
import { PRICE_LABEL, TRIAL_DAYS } from "@/lib/billing";
import { PhonePreview } from "./_site/phone-preview";
import { SiteFooter } from "./_site/site-footer";

export const metadata = {
  title: {
    absolute: "Dimeta · Saiba quanto você pode gastar até o próximo salário",
  },
  description:
    "Dinheiro, cartões, contas, provas e hábitos organizados pelo seu ciclo, do dia do salário até o próximo. 7 dias grátis.",
};

// Com o login ligado, o botão leva a criar conta; antes disso, abre o app em modo teste.
const START = AUTH_ENABLED ? "/login?modo=criar" : "/app";
const ENTER = AUTH_ENABLED ? "/login" : "/app";

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
    title: "A prova passa batido",
    text: "Prova, boleto, renovação: estava anotado em algum lugar que você não abriu.",
  },
];

const STEPS = [
  {
    title: "Responda 5 perguntas",
    text: "Dia do salário, cartão, contas fixas, se estuda e se quer acompanhar hábitos. Leva menos de 2 minutos.",
  },
  {
    title: "Lance falando ou escrevendo",
    text: "“Mercado 45 no pix”, “prova de Estatística sexta 19h”. O Dimeta entende e coloca no lugar certo.",
  },
  {
    title: "Veja quanto pode gastar por dia",
    text: "O que entrou, menos o que saiu, menos as contas e faturas que ainda vencem até o próximo salário.",
  },
];

const FEATURES = [
  {
    icon: CreditCard,
    title: "Cartões e parcelas",
    text: "Cada parcela aparece na fatura em que vai cair.",
  },
  {
    icon: Repeat,
    title: "Contas fixas",
    text: "Aluguel, luz, internet: avisa antes de vencer e já desconta do Saldo.",
  },
  {
    icon: PiggyBank,
    title: "Metas e reserva",
    text: "Quanto guardar por ciclo para chegar na data que você quer.",
  },
  {
    icon: CalendarClock,
    title: "Agenda com avisos",
    text: "Provas, compromissos e boletos numa lista só, com lembrete.",
  },
  {
    icon: BookOpen,
    title: "Estudos",
    text: "Notas, média, faltas, horário de aulas e plano de estudo para a prova.",
  },
  {
    icon: Mic,
    title: "Voz",
    text: "Aperte o microfone e fale. O texto aparece enquanto você fala.",
  },
];

const PLAN_ITEMS = [
  "Tudo do Dimeta, sem limite de cartões, metas ou hábitos",
  "Celular e computador com a mesma conta",
  "Lembretes de contas, faturas e provas",
  "Exportar seus dados quando quiser",
];

const FAQ = [
  {
    q: "Como funcionam os 7 dias grátis?",
    a: `Você cria a conta e usa tudo por ${TRIAL_DAYS} dias sem pagar nada. Depois, a assinatura custa ${PRICE_LABEL} por mês, no Pix, cartão ou boleto.`,
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, em Assinatura, sem multa. O acesso continua até o fim do mês já pago e seus dados ficam guardados se você voltar.",
  },
  {
    q: "O Dimeta se conecta com meu banco?",
    a: "Não. Você lança os gastos, falando ou escrevendo, o que leva poucos segundos. O Dimeta nunca pede senha de banco ou de cartão.",
  },
  {
    q: "Funciona no computador?",
    a: "Sim. Abre em qualquer navegador e pode ser instalado no celular como um app. O que você lança no celular aparece no computador.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Cada conta só enxerga os próprios dados, e essa regra é aplicada direto no banco de dados. Você pode exportar ou excluir tudo pelo Perfil.",
  },
];

export default function SitePage() {
  return (
    <div className="app-theme">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2 text-[15px]">
          <Link
            href={ENTER}
            className="hidden h-11 items-center rounded-2xl px-4 font-bold text-ink-soft hover:text-ink sm:flex"
          >
            Entrar
          </Link>
          <Link
            href={START}
            className="grad-primary flex h-11 items-center rounded-2xl px-4 font-bold text-white"
          >
            Começar grátis
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pt-8 pb-20 lg:grid-cols-[1.2fr_1fr] lg:pt-14 lg:pb-24">
          <div>
            <h1 className="max-w-[15ch] text-[2.75rem] leading-[1.02] font-extrabold tracking-[-0.03em] sm:text-[4rem]">
              Saiba quanto você pode gastar até o próximo salário.
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-ink-soft">
              O Dimeta junta dinheiro, cartões, contas, provas e hábitos, e
              organiza tudo pelo dia em que o seu dinheiro entra.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={START}
                className="grad-primary flex h-14 items-center justify-center rounded-2xl px-7 text-base font-extrabold whitespace-nowrap text-white"
              >
                Começar 7 dias grátis
              </Link>
              <p className="text-sm text-ink-soft">
                Depois, {PRICE_LABEL} por mês. Cancele quando quiser.
              </p>
            </div>
          </div>
          <PhonePreview />
        </section>

        <section className="border-y border-white/[0.07] bg-[#0b1128]">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
            <h2 className="max-w-[22ch] text-3xl leading-tight sm:text-4xl">
              Planilha você abandona em duas semanas. O problema continua.
            </h2>
            <dl className="mt-10 grid gap-8 md:grid-cols-3">
              {PAINS.map((p) => (
                <div key={p.title} className="border-t-2 border-[#a78bfa] pt-4">
                  <dt className="text-lg font-bold">{p.title}</dt>
                  <dd className="mt-2 leading-relaxed text-ink-soft">
                    {p.text}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
          <h2 className="text-3xl leading-tight sm:text-4xl">Como funciona</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span
                  aria-hidden
                  className="grad-primary grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-extrabold text-white"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg leading-snug font-bold">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16 lg:pb-24">
          <h2 className="max-w-[22ch] text-3xl leading-tight sm:text-4xl">
            O dinheiro no centro, a rotina em volta.
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="glass flex gap-4 rounded-3xl p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#4361f5]/20 text-[#b9c6ff]">
                  <Icon size={22} aria-hidden />
                </span>
                <div>
                  <h3 className="text-[17px] font-bold">{title}</h3>
                  <p className="mt-1 leading-relaxed text-ink-soft">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16 lg:pb-24">
          <div className="hero-card grid gap-8 rounded-3xl px-7 py-10 md:grid-cols-[1.3fr_1fr] md:items-center md:px-12 md:py-14">
            <div>
              <h2 className="text-3xl leading-tight sm:text-4xl">
                Celular sem bateria? Abre no computador.
              </h2>
              <p className="mt-4 max-w-[48ch] text-lg leading-relaxed text-[#c7cff7]">
                O Dimeta funciona no navegador de qualquer aparelho. No celular,
                dá para instalar com ícone na tela inicial, sem loja de apps.
              </p>
            </div>
            <ul className="space-y-3 text-[15px] font-semibold">
              <li className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                <Smartphone size={20} aria-hidden /> Android e iPhone, instalado
                como app
              </li>
              <li className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                <Check size={20} aria-hidden /> Computador, direto no navegador
              </li>
            </ul>
          </div>
        </section>

        <section id="preco" className="mx-auto max-w-6xl px-6 pb-16 lg:pb-24">
          <h2 className="text-3xl leading-tight sm:text-4xl">
            Um plano, tudo incluído
          </h2>
          <article className="glass mt-8 max-w-xl rounded-3xl border-[#a78bfa]/45 p-7 sm:p-9">
            <p className="text-sm font-bold text-[#c4b5fd]">
              {TRIAL_DAYS} dias grátis para testar
            </p>
            <p className="mt-2 text-5xl font-extrabold tracking-[-0.03em]">
              {PRICE_LABEL}
              <span className="text-lg font-bold text-ink-soft"> por mês</span>
            </p>
            <ul className="mt-6 space-y-2.5 text-[15px]">
              {PLAN_ITEMS.map((it) => (
                <li key={it} className="flex gap-2.5">
                  <Check
                    size={18}
                    className="mt-0.5 shrink-0 text-[#a78bfa]"
                    aria-hidden
                  />
                  {it}
                </li>
              ))}
            </ul>
            <Link
              href={START}
              className="grad-primary mt-8 flex h-14 items-center justify-center rounded-2xl text-base font-extrabold text-white"
            >
              Começar {TRIAL_DAYS} dias grátis
            </Link>
            <p className="mt-3 text-center text-sm text-ink-soft">
              Pix, cartão ou boleto. Cancele quando quiser.
            </p>
          </article>
        </section>

        <section className="border-t border-white/[0.07] bg-[#0b1128]">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_1.6fr] lg:py-24">
            <h2 className="text-3xl leading-tight sm:text-4xl">
              Perguntas frequentes
            </h2>
            <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold">
                    {item.q}
                    <span
                      aria-hidden
                      className="text-2xl leading-none text-[#a78bfa] transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
          <h2 className="max-w-[18ch] text-3xl leading-tight sm:text-5xl">
            Descubra hoje quanto você pode gastar até o próximo salário.
          </h2>
          <Link
            href={START}
            className="grad-primary mt-8 inline-flex h-14 items-center rounded-2xl px-7 text-base font-extrabold text-white"
          >
            Começar {TRIAL_DAYS} dias grátis
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
