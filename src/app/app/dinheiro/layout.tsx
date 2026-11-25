import { MoneyTabs } from "@/components/money-tabs";
import { PageHeader } from "@/components/page-header";

export default function MoneyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Dinheiro" />
      <MoneyTabs />
      {children}
    </>
  );
}
