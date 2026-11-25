import { BottomNav, MobileTop, SideNav } from "@/components/app-nav";
import { QuickAdd } from "@/components/quick-add";
import { Suspense } from "react";
import { VoiceChat } from "@/components/voice-chat";
import { UndoProvider } from "@/components/undo";
import { Welcome } from "@/components/welcome";
import { Tutorial } from "@/components/tutorial";
import { VoiceListener } from "@/components/voice-listener";
import { AccessGate } from "@/components/access-gate";
import { getAccess } from "@/lib/subscription";
import { getCards, getCategories } from "@/lib/finance";
import { requireProfile } from "@/lib/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, cards, profile, { access }] = await Promise.all([
    getCategories(),
    getCards(),
    requireProfile(),
    getAccess(),
  ]);
  const hidden = { studies: profile.hideStudies, habits: profile.hideHabits };
  const initial = (profile.displayName?.trim()?.[0] ?? "D").toUpperCase();

  return (
    <UndoProvider>
      <div className="app-theme lg:flex">
        <a
          href="#conteudo"
          className="sr-only z-50 rounded-xl bg-[#4361f5] px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Pular para o conteúdo
        </a>
        <SideNav
          hidden={hidden}
          action={
            <QuickAdd categories={categories} cards={cards} variant="sidebar" />
          }
        />
        <main id="conteudo" className="mx-auto min-h-dvh w-full max-w-md px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:flex lg:h-dvh lg:w-auto lg:max-w-5xl lg:min-w-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-10 lg:pb-8">
          <MobileTop initial={initial} />
          {children}
        </main>
        <QuickAdd categories={categories} cards={cards} variant="fab" />
        <BottomNav hidden={hidden} />
        <VoiceListener />
        <Suspense fallback={null}>
          <VoiceChat name={profile.displayName?.split(" ")[0] ?? null} />
        </Suspense>
        <AccessGate
          blocked={access.kind === "blocked"}
          reason={
            access.kind === "blocked"
              ? access.reason === "trial_over"
                ? "Seus 7 dias grátis terminaram"
                : access.reason === "canceled"
                  ? "Sua assinatura foi cancelada"
                  : "O pagamento ainda não entrou"
              : ""
          }
        />
        {profile.tutorialDone ? (
          <Welcome
            vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
          />
        ) : (
          <Tutorial
            vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
            payday={profile.cycleStartDay}
          />
        )}
      </div>
    </UndoProvider>
  );
}

export const viewport = { themeColor: "#070b1f" };
