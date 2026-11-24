import { PageHeader } from "@/components/page-header";
import { setNavPrefs } from "@/app/app/actions";
import { getCategories } from "@/lib/finance";
import { requireProfile } from "@/lib/profile";
import { CategoriesSection } from "./categories";
import { PushToggle } from "./push-toggle";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Perfil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [profile, categories] = await Promise.all([requireProfile(), getCategories()]);

  return (
    <>
      <PageHeader title="Perfil" subtitle="Seu nome, seu ciclo, lembretes e categorias." />
      <section className="glass rounded-3xl p-5">
        <ProfileForm displayName={profile.displayName ?? ""} cycleStartDay={profile.cycleStartDay} />
      </section>
      <PushToggle vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      <section className="glass mt-5 rounded-3xl p-5">
        <h2 className="text-lg font-semibold">Abas do menu</h2>
        <p className="mt-1 text-sm text-ink-soft">Mostre ou esconda Estudos e Hábitos. Nada do que você cadastrou é apagado.</p>
        <ul className="mt-3 divide-y divide-white/[0.07]">
          {[
            { key: "hide_studies", label: "Estudos", hidden: profile.hideStudies },
            { key: "hide_habits", label: "Hábitos", hidden: profile.hideHabits },
          ].map((it) => (
            <li key={it.key} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[15px] font-semibold">
                {it.label}{" "}
                <span className="text-sm font-normal text-ink-soft">{it.hidden ? "· escondida" : "· no menu"}</span>
              </span>
              <form action={setNavPrefs}>
                <input type="hidden" name={it.key} value={it.hidden ? "false" : "true"} />
                <button
                  type="submit"
                  className="h-11 rounded-xl border border-white/[0.14] px-4 text-sm font-bold hover:bg-white/[0.05]"
                >
                  {it.hidden ? "Mostrar" : "Esconder"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
      <CategoriesSection categories={categories} />
    </>
  );
}
