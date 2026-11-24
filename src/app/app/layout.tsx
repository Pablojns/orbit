import { BottomNav, MobileTop, SideNav } from "@/components/app-nav";
import { QuickAdd } from "@/components/quick-add";
import { QuickTextBar } from "@/components/quick-text";
import { UndoProvider } from "@/components/undo";
import { Welcome } from "@/components/welcome";
import { Tutorial } from "@/components/tutorial";
import { getCards, getCategories } from "@/lib/finance";
import { requireProfile } from "@/lib/profile";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [categories, cards, profile] = await Promise.all([getCategories(), getCards(), requireProfile()]);
  const hidden = { studies: profile.hideStudies, habits: profile.hideHabits };
  const initial = (profile.displayName?.trim()?.[0] ?? "D").toUpperCase();

  return (
    <UndoProvider>
      <div className="app-theme lg:flex">
        <SideNav hidden={hidden} action={<QuickAdd categories={categories} cards={cards} variant="sidebar" />} />
        <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:flex lg:h-dvh lg:w-auto lg:max-w-5xl lg:min-w-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-10 lg:pb-8">
          <MobileTop initial={initial} />
          <QuickTextBar />
          {children}
        </main>
        <QuickAdd categories={categories} cards={cards} variant="fab" />
        <BottomNav hidden={hidden} />
        {profile.tutorialDone ? (
          <Welcome vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
        ) : (
          <Tutorial vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} payday={profile.cycleStartDay} />
        )}
      </div>
    </UndoProvider>
  );
}

export const viewport = { themeColor: "#070b1f" };
