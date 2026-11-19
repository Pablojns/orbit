import { BottomNav, SideNav } from "@/components/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex">
      <SideNav />
      <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:max-w-3xl lg:px-10 lg:pb-12">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
