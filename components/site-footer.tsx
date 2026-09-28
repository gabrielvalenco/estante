import Link from "next/link";

import { Mark } from "@/components/brand";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page flex flex-col gap-4 py-8 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Mark size={18} />
          <span>
            {SITE.name} é um projeto de portfólio. Leitores e reviews são fictícios.
          </span>
        </div>
        <div className="flex items-center gap-5">
          <span>
            Dados e capas da{" "}
            <a href="https://openlibrary.org" className="text-ink-2 underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              Open Library
            </a>
          </span>
          <Link href={SITE.repo} className="text-ink-2 underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
            Código no GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
