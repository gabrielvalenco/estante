import type { Metadata } from "next";
import Link from "next/link";

import { getTicket } from "@/app/support-actions";
import { TicketHeader, TicketThread } from "@/components/support";

// O token no endereço é a chave do pedido: sem indexação e sem repassar o endereço a outros sites.
export const metadata: Metadata = { title: "Pedido de suporte", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Props = { params: Promise<{ token: string }> };

/** Pedido de quem não tem conta, aberto pelo link privado. */
export default async function GuestTicketPage({ params }: Props) {
  const { token } = await params;
  const ticket = await getTicket({ token });
  if (!ticket) {
    return (
      <div className="container-page pt-14 text-center">
        <h1 className="text-xl font-semibold text-ink">Pedido não encontrado</h1>
        <p className="mt-2 text-ink-3">Confira se o link está completo.</p>
        <Link href="/ajuda" className="mt-3 inline-block text-anil">
          Ir para a Ajuda
        </Link>
      </div>
    );
  }
  return (
    <div className="container-page animate-fade-up max-w-3xl pt-10 sm:pt-14">
      <p className="rounded-2xl bg-sunken px-4 py-3 text-sm text-ink-3">Este link é privado: quem tiver ele vê este pedido. Não compartilhe.</p>
      <TicketHeader ticket={ticket} />
      <TicketThread ticket={ticket} refKey={{ token }} />
    </div>
  );
}
