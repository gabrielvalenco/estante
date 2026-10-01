import { ChevronDown, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/support";
import { currentProfileId } from "@/lib/session";
import { FAQ, SUPPORT_TOPICS, type SupportTopic } from "@/lib/support";

export const metadata: Metadata = {
  title: "Ajuda",
  description: "Perguntas frequentes sobre conta, planos, leitura e privacidade, e contato com o suporte da Estante.",
};

type Props = { searchParams: Promise<{ assunto?: string }> };

export default async function HelpPage({ searchParams }: Props) {
  const { assunto } = await searchParams;
  const me = await currentProfileId();
  const initialTopic = SUPPORT_TOPICS.includes(assunto as SupportTopic) ? (assunto as SupportTopic) : undefined;

  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-anil">Ajuda</p>
          <h1 className="mt-1 text-title font-semibold text-ink">Como podemos ajudar?</h1>
          <p className="mt-2 text-ink-3">Veja as dúvidas mais comuns. Não achou? Fale com a gente no fim da página.</p>
        </div>
        {me && (
          <Link href="/ajuda/pedidos" className="inline-flex h-10 items-center gap-2 rounded-full bg-sunken px-4 text-sm font-medium text-ink-2 hover:bg-line">
            <Inbox className="size-4" aria-hidden />
            Meus pedidos
          </Link>
        )}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        {FAQ.map((group) => (
          <section key={group.title} aria-labelledby={`faq-${group.title}`}>
            <h2 id={`faq-${group.title}`} className="text-lg font-semibold text-ink">
              {group.title}
            </h2>
            <div className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
              {group.items.map((item) => (
                <details key={item.q} className="group px-4 py-3.5 sm:px-5">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="mt-0.5 size-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{item.a}</p>
                  {item.link && (
                    <Link href={item.link.href} className="mt-2 inline-block text-sm font-medium text-anil hover:text-anil-hover">
                      {item.link.label} →
                    </Link>
                  )}
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section id="contato" aria-labelledby="contato-title" className="mx-auto mt-16 max-w-2xl scroll-mt-24">
        <h2 id="contato-title" className="text-title font-semibold text-ink">
          Fale com a gente
        </h2>
        <p className="mt-2 mb-6 text-ink-3">
          {me ? "Junto do pedido vão seu perfil e seu plano, para não precisarmos perguntar." : "Sem conta, tudo bem: deixe um e-mail para a resposta."} Respondemos em até 2 dias úteis.
        </p>
        <ContactForm loggedIn={Boolean(me)} initialTopic={initialTopic} />
      </section>
    </div>
  );
}
