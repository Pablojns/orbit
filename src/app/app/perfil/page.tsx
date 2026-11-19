import { PageHeader } from "@/components/page-header";
import { requireProfile } from "@/lib/profile";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Perfil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireProfile();

  return (
    <>
      <PageHeader title="Perfil" subtitle={profile.email ?? undefined} />
      <section className="rounded-3xl bg-card p-5">
        <ProfileForm displayName={profile.displayName ?? ""} cycleStartDay={profile.cycleStartDay} />
      </section>

      <form action="/auth/signout" method="post" className="mt-6">
        <button
          type="submit"
          className="w-full rounded-2xl border border-line px-5 py-3 text-base font-medium text-loss"
        >
          Sair da conta
        </button>
      </form>
    </>
  );
}
