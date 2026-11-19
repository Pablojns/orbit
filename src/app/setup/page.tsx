export const metadata = { title: "Configuração" };

// Aparece só quando as variáveis do Supabase não foram configuradas.
export default function SetupPage() {
  return (
    <main className="mx-auto max-w-md px-6 pt-16 pb-10">
      <h1 className="text-[2rem] leading-tight font-bold">Falta conectar o Supabase</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        O app precisa de duas variáveis de ambiente para funcionar. Na Vercel: Settings → Environment Variables.
        No computador: arquivo <code>.env.local</code>.
      </p>
      <pre className="mt-6 overflow-x-auto rounded-2xl bg-card p-4 text-sm">
        {`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`}
      </pre>
      <p className="mt-4 text-sm text-ink-soft">
        Os dois valores ficam no Supabase, em Project Settings → API Keys. Depois de salvar na Vercel, faça um novo
        deploy.
      </p>
    </main>
  );
}
