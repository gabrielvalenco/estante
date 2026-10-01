import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { listMyTickets } from "@/app/support-actions";
import { StatusBadge } from "@/components/support";
import { Button } from "@/components/ui/button";
import { ticketLabel, TOPIC_LABELS } from "@/lib/support";

export const metadata: Metadata = { title: "Meus pedidos", robots: { index: false } };

export default async function MyTicketsPage() {
  const tickets = await listMyTickets();
  if (!tickets) redirect("/entrar?next=/ajuda/pedidos");

  return (
    <div className="container-page animate-fade-up max-w-3xl pt-10 sm:pt-14">
      <Link href="/ajuda" className="text-sm text-ink-3 hover:text-ink">
        ← Ajuda
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-title font-semibold text-ink">Meus pedidos</h1>
        <Button nativeButton={false} render={<Link href="/ajuda#contato" />}>
          Novo pedido
        </Button>
      </div>
      {tickets.length ? (
        <ul className="mt-8 divide-y divide-line rounded-2xl border border-line bg-surface">
          {tickets.map((t) => (
            <li key={t.number}>
              <Link href={`/ajuda/pedidos/${t.number}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 hover:bg-sunken/60 sm:px-5">
                <span className="tnum text-sm text-ink-4">{ticketLabel(t.number)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{t.subject}</span>
                  <span className="text-sm text-ink-3">
                    {TOPIC_LABELS[t.topic]}
                    {t.lastFrom === "suporte" && t.status === "respondido" ? " · nova resposta" : ""}
                  </span>
                </span>
                <StatusBadge status={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-2xl bg-sunken p-6 text-center text-ink-3">Você ainda não abriu nenhum pedido.</p>
      )}
    </div>
  );
}
