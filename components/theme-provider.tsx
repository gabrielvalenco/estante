"use client";

import { ThemeProvider as NextThemes } from "next-themes";

/** Tema por classe no <html>. Padrão: seguir o sistema. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}
