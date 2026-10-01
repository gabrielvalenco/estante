import type { Metadata } from "next";
import Link from "next/link";

import { getTicket } from "@/app/support-actions";
import { TicketHeader, TicketThread } from "@/components/support";

export const metadata: Metadata = { title: "Pedido de suporte", robots: { index: false } };

type Props = { params: Promise<{ number: string }> };

/** Um pedido de quem está logado (só o dono vê). */
export default async function MyTicketPage({ params }: Props) {
  const number = Number((await params).number);
  const ticket = await getTicket({ number });
  if (!ticket) {
    return (
      <div className="container-page pt-14 text-center">
        <h1 className="text-xl font-semibold text-ink">Pedido não encontrado</h1>
        <Link href="/ajuda/pedidos" className="mt-3 inline-block text-anil">
          Ver meus pedidos
        </Link>
      </div>
    );
  }
  return (
    <div className="container-page animate-fade-up max-w-3xl pt-10 sm:pt-14">
      <Link href="/ajuda/pedidos" className="text-sm text-ink-3 hover:text-ink">
        ← Meus pedidos
      </Link>
      <TicketHeader ticket={ticket} />
      <TicketThread ticket={ticket} refKey={{ number }} />
    </div>
  );
}
