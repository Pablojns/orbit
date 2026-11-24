import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar ou criar conta" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;

  return (
    <main className="app-theme mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-16 pb-10">
      <h1 className="mt-6 text-[2.2rem] leading-[1.05] font-extrabold">
        Saiba quanto você pode gastar até o próximo salário.
      </h1>
      <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">
        Dinheiro, prazos e hábitos no mesmo lugar, organizados pelo seu ciclo, não pelo calendário.
      </p>

      {erro ? (
        <p role="alert" className="mt-6 rounded-2xl bg-loss/10 px-4 py-3 text-sm text-loss">
          O link de confirmação expirou ou já foi usado. Entre com e-mail e senha.
        </p>
      ) : null}

      <div className="mt-auto pt-10">
        <LoginForm />
      </div>
    </main>
  );
}
