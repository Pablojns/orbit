import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

export const metadata: Metadata = {
  title: { default: "Orbit", template: "%s · Orbit" },
  description: "Seu dinheiro, seus prazos e seus hábitos no mesmo lugar.",
  applicationName: "Orbit",
  appleWebApp: { capable: true, title: "Orbit", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#eef0fa",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-sky text-ink">
        {children}
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
