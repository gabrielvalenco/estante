import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { AuthSync } from "@/components/auth-sync";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE } from "@/lib/site";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
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
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <SiteHeader />
            <main className="relative isolate min-h-[calc(100dvh-3.5rem)]">{children}</main>
            <SiteFooter />
          </TooltipProvider>
          <Toaster position="bottom-center" />
          <AuthSync />
        </ThemeProvider>
      </body>
    </html>
  );
}
