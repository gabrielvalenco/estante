import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { AuthProvider } from "@/components/auth-sync";
import { SiteFooter } from "@/components/site-footer";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authFlags } from "@/lib/auth-flags";
import { SITE } from "@/lib/site";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

// Base das URLs absolutas (prévias de link nas redes precisam de endereço completo).
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${SITE.name}, ${SITE.tagline.toLowerCase()}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  openGraph: { type: "website", locale: "pt_BR", siteName: SITE.name },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
  colorScheme: "light dark",
  // Deixa a barra de abas usar a área segura do iPhone (env(safe-area-inset-bottom)).
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      {/* No celular, espaço no fim da página para a barra de abas não cobrir o rodapé. */}
      <body className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <ThemeProvider>
          <AuthProvider flags={authFlags}>
            <TooltipProvider>
              <SiteHeader />
              <main className="relative isolate min-h-[calc(100dvh-3.5rem)]">{children}</main>
              <SiteFooter />
              <MobileTabBar />
            </TooltipProvider>
            <Toaster position="bottom-center" mobileOffset={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }} />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
