import Link from "next/link";
import type { ReactNode } from "react";

import { formatLongDate } from "@/lib/dates";
import { SITE } from "@/lib/site";

/** Página de texto legal: leitura confortável, índice no topo e âncoras por seção. */
export function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: { id: string; title: string; body: ReactNode }[] }) {
  return (
    <article className="container-page animate-fade-up pt-10 sm:pt-14">
      <div className="max-w-[44rem]">
        <p className="text-sm text-ink-3">Atualizada em {formatLongDate(SITE.legalUpdatedAt)}</p>
        <h1 className="mt-2 text-title font-semibold text-ink">{title}</h1>
        <div className="mt-4 text-[1.0625rem] leading-relaxed text-ink-2">{intro}</div>

        <nav aria-label="Nesta página" className="mt-8 rounded-2xl bg-sunken p-5">
          <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Nesta página</p>
          <ol className="mt-3 grid gap-1.5 text-[0.9375rem] sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-ink-2 hover:text-anil">
                  <span className="tnum mr-2 text-ink-4">{i + 1}.</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="mt-12 scroll-mt-20">
            <h2 className="text-section font-semibold text-ink">
              <span className="tnum mr-2 text-ink-4">{i + 1}.</span>
              {s.title}
            </h2>
            <div className="legal mt-4 grid gap-4 text-[0.9875rem] leading-relaxed text-ink-2">{s.body}</div>
          </section>
        ))}
      </div>
    </article>
  );
}

/** Como falar com o controlador: e-mail, se configurado; senão, o repositório público. */
export function ContactLine() {
  return SITE.contactEmail ? (
    <>
      pelo e-mail{" "}
      <a href={`mailto:${SITE.contactEmail}`} className="font-medium text-anil hover:text-anil-hover">
        {SITE.contactEmail}
      </a>
    </>
  ) : (
    <>
      abrindo uma issue no{" "}
      <Link href={SITE.repo} className="font-medium text-anil hover:text-anil-hover" target="_blank" rel="noreferrer">
        repositório do projeto
      </Link>
    </>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="grid list-disc gap-2 pl-5 marker:text-ink-4">{children}</ul>;
}
