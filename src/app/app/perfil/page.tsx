import { PageHeader } from "@/components/page-header";
import { requireProfile } from "@/lib/profile";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Perfil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireProfile();

  return (
    <>
      <PageHeader title="Perfil" subtitle="Seu nome e o dia em que seu ciclo começa." />
      <section className="glass rounded-[1.75rem] p-5">
        <ProfileForm displayName={profile.displayName ?? ""} cycleStartDay={profile.cycleStartDay} />
      </section>
    </>
  );
}
