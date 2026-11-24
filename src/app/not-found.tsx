import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-theme grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl">Página não encontrada</h1>
        <p className="mt-2 text-[15px] text-ink-soft">O endereço pode ter mudado.</p>
        <Link href="/app" className="grad-primary mt-6 inline-flex h-11 items-center rounded-2xl px-5 text-sm font-bold text-white">
          Abrir o Dimeta
        </Link>
      </div>
    </main>
  );
}
