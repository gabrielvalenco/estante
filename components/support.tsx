"use client";

import { CheckCircle2, Copy, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createTicketAction, replyTicketAction, resolveTicketAction, setTicketStatusAction, staffReplyAction, type TicketView } from "@/app/support-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABELS, SUPPORT_EMAIL, SUPPORT_TOPICS, ticketLabel, TOPIC_LABELS, type SupportError, type SupportStatus, type SupportTopic } from "@/lib/support";
import { cn } from "@/lib/utils";

const ERRORS: Record<SupportError, string> = {
  invalid: "Confira os campos: assunto com pelo menos 3 letras e mensagem com pelo menos 10.",
  rate_limited: "Muitos pedidos seguidos. Espere um pouco e tente de novo.",
  not_found: "Pedido não encontrado.",
  unauthenticated: "Entre na sua conta para continuar.",
  forbidden: "Sem permissão.",
};

const formatDate = (ts: number) => new Date(ts).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function StatusBadge({ status }: { status: SupportStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        status === "aberto" && "bg-ambar-soft text-ambar-ink",
        status === "respondido" && "bg-anil-soft text-anil",
        status === "resolvido" && "bg-musgo-soft text-musgo",
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function TicketHeader({ ticket }: { ticket: Pick<TicketView, "number" | "subject" | "topic" | "status"> }) {
  return (
    <div className="mt-3 mb-6">
      <p className="text-sm text-ink-4">
        {ticketLabel(ticket.number)} · {TOPIC_LABELS[ticket.topic]}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">{ticket.subject}</h1>
        <StatusBadge status={ticket.status} />
      </div>
    </div>
  );
}

/** Formulário de contato. Sem conta, pede e-mail; com conta, o e-mail é opcional (a resposta chega como notificação). */
export function ContactForm({ loggedIn, initialTopic }: { loggedIn: boolean; initialTopic?: SupportTopic }) {
  const [topic, setTopic] = useState<SupportTopic | null>(initialTopic ?? null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number: number; token: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic) return setError("Escolha o assunto.");
    if (!loggedIn && !email.includes("@")) return setError("Informe um e-mail para receber a resposta.");
    setBusy(true);
    setError(null);
    const r = await createTicketAction({ topic, subject, body, email, name, website, page: document.referrer.slice(0, 200) }).catch(() => ({ ok: false as const, error: "invalid" as const }));
    setBusy(false);
    if (r.ok) setDone({ number: r.number, token: r.token });
    else setError(ERRORS[r.error]);
  }

  if (done) {
    const privateLink = `${window.location.origin}/ajuda/pedido/${done.token}`;
    return (
      <div className="rounded-3xl border border-musgo/30 bg-musgo-soft p-6 sm:p-8">
        <CheckCircle2 className="size-7 text-musgo" aria-hidden />
        <h3 className="mt-3 text-lg font-semibold text-ink">Pedido {ticketLabel(done.number)} enviado</h3>
        {loggedIn ? (
          <>
            <p className="mt-1.5 text-ink-2">A resposta chega nas suas notificações, aqui e no app.</p>
            <Button className="mt-5" nativeButton={false} render={<Link href={`/ajuda/pedidos/${done.number}`} />}>
              Ver o pedido
            </Button>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-ink-2">
              Respondemos no e-mail que você informou. Guarde também este link privado: por ele você acompanha e responde o pedido.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={privateLink} aria-label="Link privado do pedido" onFocus={(e) => e.currentTarget.select()} />
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(privateLink).then(
                    () => toast("Link copiado"),
                    () => toast.error("Não foi possível copiar"),
                  );
                }}
              >
                <Copy data-icon="inline-start" />
                Copiar
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8" noValidate>
      <fieldset>
        <legend className="text-sm font-medium text-ink-2">Assunto</legend>
        <div role="radiogroup" aria-label="Assunto" className="mt-2 flex flex-wrap gap-2">
          {SUPPORT_TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={topic === t}
              onClick={() => setTopic(t)}
              className={cn(
                "h-9 rounded-full px-3.5 text-[0.8125rem] font-medium transition-colors",
                topic === t ? "bg-ink text-on-ink" : "bg-sunken text-ink-2 hover:bg-line",
              )}
            >
              {TOPIC_LABELS[t]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-ink-2">Resumo</span>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="Ex.: Não consigo entrar no app" required />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-ink-2">Conte o que aconteceu</span>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={6} placeholder="O que você tentou fazer, o que apareceu na tela e, se for o caso, em qual livro." required />
      </label>

      {!loggedIn && (
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink-2">Seu nome (opcional)</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
        </label>
      )}
      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-ink-2">{loggedIn ? "E-mail para resposta (opcional)" : "Seu e-mail"}</span>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" required={!loggedIn} />
        {loggedIn && <span className="text-xs text-ink-4">A resposta já chega nas suas notificações. Use se preferir receber por e-mail também.</span>}
      </label>

      {/* Campo-armadilha: escondido de pessoas, preenchido por robôs. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Site
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" size="lg" disabled={busy}>
          Enviar pedido
        </Button>
        <p className="text-sm text-ink-3">
          Prefere e-mail?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-anil hover:text-anil-hover">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </form>
  );
}

/** Conversa de um pedido, para quem pediu (pelo número, logado, ou pelo token do link privado). */
export function TicketThread({ ticket, refKey }: { ticket: TicketView; refKey: { number: number } | { token: string } }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function reply() {
    if (!body.trim()) return;
    setBusy(true);
    const r = await replyTicketAction(refKey, body).catch(() => ({ ok: false as const, error: "invalid" as const }));
    setBusy(false);
    if (!r.ok) return toast.error(ERRORS[r.error]);
    setBody("");
    router.refresh();
  }

  async function resolve() {
    setBusy(true);
    await resolveTicketAction(refKey).catch(() => null);
    setBusy(false);
    toast("Pedido marcado como resolvido");
    router.refresh();
  }

  return (
    <div>
      <Messages ticket={ticket} />
      <div className="mt-6 grid gap-3 rounded-3xl border border-line bg-surface p-5 shadow-card">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink-2">{ticket.status === "resolvido" ? "Precisa de mais alguma coisa? Escreva para reabrir" : "Responder"}</span>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={4} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={reply} disabled={busy || !body.trim()}>
            Enviar
          </Button>
          {ticket.status !== "resolvido" && (
            <Button variant="secondary" onClick={resolve} disabled={busy}>
              Marcar como resolvido
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Mensagens do pedido. Na caixa da equipe, `labels.pessoa` troca o "Você" pelo nome de quem pediu. */
export function Messages({ ticket, labels }: { ticket: TicketView; labels?: { pessoa?: string } }) {
  return (
    <ol className="grid gap-3">
      {ticket.messages.map((m, i) => (
        <li key={i} className={cn("rounded-2xl border p-4", m.author === "suporte" ? "border-anil/25 bg-anil-soft/60" : "border-line bg-surface")}>
          <p className="flex items-center justify-between gap-3 text-xs text-ink-3">
            <span className={cn("font-semibold", m.author === "suporte" ? "text-anil" : "text-ink-2")}>{m.author === "suporte" ? "Suporte da Estante" : (labels?.pessoa ?? "Você")}</span>
            <time dateTime={new Date(m.createdAt).toISOString()}>{formatDate(m.createdAt)}</time>
          </p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink">{m.body}</p>
        </li>
      ))}
    </ol>
  );
}

/** Resposta da equipe, com atalho para responder por e-mail a quem não tem conta. */
export function StaffReply({ number, status, email, subject }: { number: number; status: SupportStatus; email: string | null; subject: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(resolve: boolean) {
    if (!body.trim()) return;
    setBusy(true);
    const r = await staffReplyAction(number, body, resolve).catch(() => ({ ok: false as const, error: "invalid" as const }));
    setBusy(false);
    if (!r.ok) return toast.error(ERRORS[r.error]);
    toast(r.notified ? "Resposta enviada e notificação entregue" : "Resposta registrada");
    setBody("");
    router.refresh();
  }

  async function setStatus(next: SupportStatus) {
    setBusy(true);
    await setTicketStatusAction(number, next).catch(() => null);
    setBusy(false);
    router.refresh();
  }

  const mailto = email
    ? `mailto:${email}?subject=${encodeURIComponent(`[Estante ${ticketLabel(number)}] ${subject}`)}&body=${encodeURIComponent(body ? `${body}\n\n— Suporte da Estante` : "")}`
    : null;

  return (
    <div className="grid gap-3 rounded-3xl border border-line bg-surface p-5 shadow-card">
      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-ink-2">Resposta</span>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={6} />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => send(false)} disabled={busy || !body.trim()}>
          Responder
        </Button>
        <Button variant="secondary" onClick={() => send(true)} disabled={busy || !body.trim()}>
          Responder e resolver
        </Button>
        {mailto && (
          <Button variant="secondary" nativeButton={false} render={<a href={mailto} />}>
            <Mail data-icon="inline-start" />
            Responder por e-mail
          </Button>
        )}
        {status !== "resolvido" ? (
          <Button variant="ghost" onClick={() => setStatus("resolvido")} disabled={busy}>
            Marcar como resolvido
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setStatus("aberto")} disabled={busy}>
            Reabrir
          </Button>
        )}
      </div>
      {mailto && <p className="text-xs text-ink-4">Por e-mail: escreva a resposta acima, abra no seu e-mail e envie de {SUPPORT_EMAIL}. Depois clique em Responder para registrar aqui também.</p>}
    </div>
  );
}
