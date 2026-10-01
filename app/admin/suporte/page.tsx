import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { listTicketsAdmin, supportAdminsConfigured } from "@/app/support-actions";
import { StatusBadge } from "@/components/support";
import { currentProfileId } from "@/lib/session";
import { STATUS_LABELS, SUPPORT_STATUSES, ticketLabel, TOPIC_LABELS, type SupportStatus } from "@/lib/support";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Suporte", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ status?: string }> };

/** Caixa de entrada do suporte. Só para quem está em SUPPORT_ADMIN_IDS; para os outros, a página não existe. */
export default async function SupportInboxPage({ searchParams }: Props) {
  const { status: raw } = await searchParams;
  const status = SUPPORT_STATUSES.includes(raw as SupportStatus) ? (raw as SupportStatus) : undefined;
  const tickets = await listTicketsAdmin(status);

  if (!tickets) {
    // Antes de configurar a equipe, quem está logado vê como se liberar (só o próprio id).
    const me = await currentProfileId();
    if (me && !(await supportAdminsConfigured())) {
      return (
        <div className="container-page max-w-xl pt-14">
          <h1 className="text-xl font-semibold text-ink">Configure a equipe de suporte</h1>
          <p className="mt-2 text-ink-2">
            Na Vercel, crie a variável <code className="rounded bg-sunken px-1.5 py-0.5 text-sm">SUPPORT_ADMIN_IDS</code> com o id do seu perfil e faça redeploy:
          </p>
          <code className="mt-3 block rounded-xl bg-sunken p-3 text-sm break-all">{me}</code>
          <p className="mt-3 text-sm text-ink-3">Para mais de uma pessoa, separe os ids por vírgula. Depois disso, esta página só abre para elas.</p>
        </div>
      );
    }
    notFound();
  }

  const tabs: { key?: SupportStatus; label: string }[] = [{ label: "Todos" }, ...SUPPORT_STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s] }))];

  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <h1 className="text-title font-semibold text-ink">Suporte</h1>
      <nav aria-label="Filtrar por status" className="scroller -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.key ? `/admin/suporte?status=${t.key}` : "/admin/suporte"}
            aria-current={t.key === status ? "true" : undefined}
            className={cn("shrink-0 rounded-full px-3.5 py-2 text-[0.8125rem] font-medium", t.key === status ? "bg-ink text-on-ink" : "bg-sunken text-ink-2 hover:bg-line")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tickets.length ? (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
          {tickets.map((t) => (
            <li key={t.number}>
              <Link href={`/admin/suporte/${t.number}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 hover:bg-sunken/60 sm:px-5">
                <span className="tnum text-sm text-ink-4">{ticketLabel(t.number)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{t.subject}</span>
                  <span className="text-sm text-ink-3">
                    {TOPIC_LABELS[t.topic]} · {t.who} · {new Date(t.updatedAt).toLocaleDateString("pt-BR")}
                  </span>
                </span>
                <StatusBadge status={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl bg-sunken p-6 text-center text-ink-3">Nenhum pedido aqui.</p>
      )}
    </div>
  );
}
