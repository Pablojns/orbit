import { BottomNav, SideNav } from "@/components/app-nav";
import { QuickAdd } from "@/components/quick-add";
import { getCategories } from "@/lib/finance";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();

  return (
    <div className="app-theme lg:flex">
      <SideNav action={<QuickAdd categories={categories} variant="sidebar" />} />
      <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:max-w-4xl lg:px-10 lg:pb-12">
        {children}
      </main>
      <QuickAdd categories={categories} variant="fab" />
      <BottomNav />
    </div>
  );
}

export const viewport = { themeColor: "#070a1a" };
