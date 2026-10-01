import Link from "next/link";

import { Mark } from "@/components/brand";
import { AFFILIATE_DISCLOSURE, affiliateEnabled } from "@/lib/affiliate";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page flex flex-col gap-4 pt-8 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Mark size={18} />
          <span>{SITE.name}. Os leitores de demonstração são fictícios.</span>
        </div>
        <nav aria-label="Rodapé" className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/planos" className="text-ink-2 underline-offset-4 hover:underline">
            Planos
          </Link>
          <Link href="/ajuda" className="text-ink-2 underline-offset-4 hover:underline">
            Ajuda
          </Link>
          <Link href="/privacidade" className="text-ink-2 underline-offset-4 hover:underline">
            Privacidade
          </Link>
          <Link href="/termos" className="text-ink-2 underline-offset-4 hover:underline">
            Termos de uso
          </Link>
          <span>
            Dados e capas da{" "}
            <a href="https://openlibrary.org" className="text-ink-2 underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              Open Library
            </a>
          </span>
        </nav>
      </div>
      <p className="container-page pt-4 pb-8 text-xs text-ink-4">{affiliateEnabled ? AFFILIATE_DISCLOSURE : null}</p>
    </footer>
  );
}
