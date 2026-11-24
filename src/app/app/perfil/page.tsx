import { PageHeader } from "@/components/page-header";
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
      <CategoriesSection categories={categories} />
    </>
  );
}
