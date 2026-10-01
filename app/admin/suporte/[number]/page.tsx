import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getTicketAdmin } from "@/app/support-actions";
import { Messages, StaffReply, TicketHeader } from "@/components/support";

export const metadata: Metadata = { title: "Pedido de suporte", robots: { index: false, follow: false } };

type Props = { params: Promise<{ number: string }> };

const PLAN_NAMES: Record<string, string> = { brochura: "Brochura", "capa-dura": "Capa Dura", "ex-libris": "Ex Libris" };

export default async function SupportTicketAdminPage({ params }: Props) {
  const ticket = await getTicketAdmin(Number((await params).number));
  if (!ticket) notFound();
  const c = ticket.context;

  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <Link href="/admin/suporte" className="text-sm text-ink-3 hover:text-ink">
        ← Suporte
      </Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          <TicketHeader ticket={ticket} />
          <Messages ticket={ticket} labels={{ pessoa: ticket.profile?.name ?? ticket.name ?? "Visitante" }} />
          <div className="mt-6">
            <StaffReply number={ticket.number} status={ticket.status} email={ticket.email} subject={ticket.subject} />
          </div>
        </div>
        <aside className="h-fit rounded-2xl border border-line bg-surface p-5 text-sm lg:mt-14">
          <h2 className="font-semibold text-ink">Quem pediu</h2>
          <dl className="mt-3 grid gap-2 text-ink-2">
            {ticket.profile ? (
              <Row label="Perfil">
                <Link href={`/u/${ticket.profile.handle}`} className="text-anil hover:text-anil-hover">
                  {ticket.profile.name} (@{ticket.profile.handle})
                </Link>
              </Row>
            ) : (
              <Row label="Conta">Sem conta{ticket.name ? ` (${ticket.name})` : ""}</Row>
            )}
            {ticket.email && <Row label="E-mail">{ticket.email}</Row>}
            {c.plan && <Row label="Plano">{PLAN_NAMES[c.plan] ?? c.plan}{c.subscription ? ` (${c.subscription})` : ""}</Row>}
            <Row label="Veio do">{c.platform === "app" ? `app${c.appVersion ? ` ${c.appVersion}` : ""}` : "site"}</Row>
            {c.page && <Row label="Página">{c.page}</Row>}
            <Row label="Aberto em">{new Date(ticket.createdAt).toLocaleString("pt-BR")}</Row>
          </dl>
          {(ticket.topic === "cobranca" || ticket.topic === "reembolso") && (
            <a href="https://dashboard.stripe.com/customers" target="_blank" rel="noreferrer" className="mt-4 inline-block font-medium text-anil hover:text-anil-hover">
              Abrir clientes no Stripe ↗
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-4">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}
