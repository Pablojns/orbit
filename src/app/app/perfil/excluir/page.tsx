import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { cancelSubscription } from "@/lib/asaas";
import { AUTH_ENABLED, BILLING_ENABLED } from "@/lib/flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { uid } from "@/lib/user";

export const metadata = { title: "Excluir conta" };

// Excluir conta e dados (só com login ligado). Pede para digitar EXCLUIR.
async function deleteAccount(fd: FormData) {
  "use server";
  if (!AUTH_ENABLED) return;
  if (
    String(fd.get("confirm") ?? "")
      .trim()
      .toUpperCase() !== "EXCLUIR"
  )
    redirect("/app/perfil/excluir?erro=1");
  const me = await uid();
  const admin = createAdminClient();
  if (BILLING_ENABLED) {
    const { data } = await admin
      .from("subscriptions")
      .select("provider_subscription_id")
      .eq("user_id", me)
      .maybeSingle();
    if (data?.provider_subscription_id)
      await cancelSubscription(data.provider_subscription_id).catch(() => null);
  }
  // Apagar o usuário apaga em cascata todos os dados ligados a ele.
  await admin.auth.admin.deleteUser(me);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?conta=excluida");
}

export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (!AUTH_ENABLED) notFound();
  const { erro } = await searchParams;
  return (
    <>
      <PageHeader
        title="Excluir conta"
        subtitle="Apaga sua conta e todos os seus dados. Não dá para desfazer."
      />
      <section className="glass rounded-3xl p-5">
        <p className="text-[15px] text-ink-soft">
          Antes, se quiser, exporte seus dados em Perfil. A assinatura, se
          houver, é cancelada junto.
        </p>
        <form action={deleteAccount} className="mt-4 space-y-3">
          <label className="block text-sm text-ink-soft">
            Digite EXCLUIR para confirmar
            <input
              name="confirm"
              required
              autoComplete="off"
              className="mt-1.5 h-12 w-full rounded-2xl border border-white/[0.1] bg-[#0f1634] px-4 text-base outline-none focus:border-loss"
            />
          </label>
          {erro ? (
            <p role="alert" className="text-sm text-loss">
              Digite EXCLUIR, em maiúsculas, para confirmar.
            </p>
          ) : null}
          <button
            type="submit"
            className="h-12 w-full rounded-2xl bg-loss text-base font-bold text-[#2a0710]"
          >
            Excluir minha conta e meus dados
          </button>
        </form>
      </section>
    </>
  );
}
