import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar ou criar conta" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-16 pb-10">
      <div aria-hidden className="relative h-28 w-28">
        <span className="absolute inset-0 rounded-full border-[10px] border-cobalt" />
        <span className="absolute top-1 right-1 h-7 w-7 rounded-full border-4 border-sky bg-sun" />
      </div>

      <h1 className="mt-10 text-[2.6rem] leading-[1.02] font-bold">
        Saiba quanto você pode gastar até o próximo salário.
      </h1>
      <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">
        Dinheiro, prazos e hábitos no mesmo lugar, organizados pelo seu ciclo, não pelo calendário.
      </p>

      {erro ? (
        <p role="alert" className="mt-6 rounded-2xl bg-loss/10 px-4 py-3 text-sm text-loss">
          O link de acesso expirou ou já foi usado. Peça um novo abaixo.
        </p>
      ) : null}

      <div className="mt-auto pt-10">
        <LoginForm />
      </div>
    </main>
  );
}
