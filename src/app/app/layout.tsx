import { BottomNav, SideNav } from "@/components/app-nav";
import { QuickAdd } from "@/components/quick-add";
import { getCards, getCategories } from "@/lib/finance";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [categories, cards] = await Promise.all([getCategories(), getCards()]);

  return (
    <div className="app-theme lg:flex">
      <SideNav action={<QuickAdd categories={categories} cards={cards} variant="sidebar" />} />
      <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:w-auto lg:max-w-5xl lg:min-w-0 lg:flex-1 lg:px-10 lg:pb-12">
        {children}
      </main>
      <QuickAdd categories={categories} cards={cards} variant="fab" />
      <BottomNav />
    </div>
  );
}

export const viewport = { themeColor: "#070a1a" };
