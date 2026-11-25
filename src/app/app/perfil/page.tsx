import { PageHeader } from "@/components/page-header";
import { saveNotifyPrefs, setNavPrefs } from "@/app/app/actions";
import { FormSheet } from "@/components/form-sheet";
import { Field, Select } from "@/components/fields";
import { AUTH_ENABLED } from "@/lib/flags";
import { getCategories } from "@/lib/finance";
import { requireProfile } from "@/lib/profile";
import { CategoriesSection } from "./categories";
import { PushToggle } from "./push-toggle";
import { VoiceSettings } from "./voice-settings";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Perfil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [profile, categories] = await Promise.all([
    requireProfile(),
    getCategories(),
  ]);

  return (
    <>
      <PageHeader title="Perfil" />
      <section className="glass rounded-3xl p-5">
        <ProfileForm
          displayName={profile.displayName ?? ""}
          cycleStartDay={profile.cycleStartDay}
        />
      </section>
      <PushToggle
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      />
      <section className="glass mt-5 rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg">Lembretes</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Resumo do dia:{" "}
              {profile.notifyDaily
                ? `ligado, às ${profile.dailyHour}h`
                : "desligado"}
              . Aviso 3 horas antes:{" "}
              {profile.notifyHour ? "ligado" : "desligado"}.
            </p>
          </div>
          <FormSheet
            title="Lembretes"
            trigger="Mudar"
            submitLabel="Salvar lembretes"
            action={saveNotifyPrefs}
            triggerClassName="h-11 shrink-0 rounded-xl border border-white/[0.14] px-4 text-sm font-bold hover:bg-white/[0.05]"
          >
            <label className="flex min-h-11 items-center gap-3 text-[15px] font-semibold">
              <input
                type="checkbox"
                name="notify_daily"
                defaultChecked={profile.notifyDaily}
                className="h-5 w-5 accent-[#4361f5]"
              />
              Resumo do dia (o que vence ou acontece hoje e amanhã)
            </label>
            <Field label="Hora do resumo">
              <Select
                name="daily_hour"
                defaultValue={String(profile.dailyHour)}
                options={Array.from({ length: 18 }, (_, i) => i + 5).map(
                  (h) => ({ value: String(h), label: `${h}h` }),
                )}
              />
            </Field>
            <label className="flex min-h-11 items-center gap-3 text-[15px] font-semibold">
              <input
                type="checkbox"
                name="notify_hour"
                defaultChecked={profile.notifyHour}
                className="h-5 w-5 accent-[#4361f5]"
              />
              Aviso 3 horas antes do que tem hora marcada
            </label>
          </FormSheet>
        </div>
      </section>
      <VoiceSettings />
      <section className="glass mt-5 rounded-3xl p-5">
        <h2 className="text-lg font-semibold">Menu</h2>
        <ul className="mt-3 divide-y divide-white/[0.07]">
          {[
            {
              key: "hide_studies",
              label: "Estudos",
              hidden: profile.hideStudies,
            },
            {
              key: "hide_habits",
              label: "Hábitos",
              hidden: profile.hideHabits,
            },
          ].map((it) => (
            <li
              key={it.key}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <span className="text-[15px] font-semibold">
                {it.label}{" "}
                <span className="text-sm font-normal text-ink-soft">
                  {it.hidden ? "· escondida" : "· no menu"}
                </span>
              </span>
              <form action={setNavPrefs}>
                <input
                  type="hidden"
                  name={it.key}
                  value={it.hidden ? "false" : "true"}
                />
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
      <section className="glass mt-5 rounded-3xl p-5">
        <h2 className="text-lg">Seus dados</h2>
        <a
          href="/api/exportar"
          download
          className="mt-3 inline-flex h-11 items-center rounded-xl border border-white/[0.14] px-4 text-sm font-bold hover:bg-white/[0.05]"
        >
          Exportar (CSV)
        </a>
      </section>
      <section className="glass mt-5 mb-4 rounded-3xl p-5">
        <h2 className="text-lg">Conta</h2>
        {AUTH_ENABLED ? (
          <div className="mt-3 flex flex-wrap gap-2.5">
            <a
              href="/auth/sair"
              className="inline-flex h-11 items-center rounded-xl border border-white/[0.14] px-4 text-sm font-bold hover:bg-white/[0.05]"
            >
              Sair
            </a>
            <a
              href="/app/perfil/excluir"
              className="inline-flex h-11 items-center rounded-xl border border-loss/50 px-4 text-sm font-bold text-loss hover:bg-loss/10"
            >
              Excluir conta e dados
            </a>
          </div>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">
            Modo de teste: sem login.
          </p>
        )}
      </section>
    </>
  );
}
