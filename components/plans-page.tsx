"use client";

import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getPlanStatus, openPortalAction, startCheckoutAction, syncCheckoutAction, type BillingError } from "@/app/billing-actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import type { PlanStatus } from "@/lib/billing";
import { cn } from "@/lib/utils";

const PRICE = { month: { value: "R$ 6,90", per: "/mês" }, year: { value: "R$ 59", per: "/ano" } };

const BROCHURA = [
  "Reviews, notas e estante sem limite",
  "Seguir leitores, feed e notificações",
  "Marcador de página em todos os livros",
  "20 citações e 3 notas por livro",
  "3 discussões novas por mês (responder é livre)",
  "Importar a estante do Goodreads",
];
const CAPA_DURA = ["Tudo do Brochura", "Citações ilimitadas", "Notas ilimitadas em cada livro", "Discussões novas sem limite", "Importar destaques do Kindle"];
const CAPA_DURA_SOON = ["Exportar suas notas", "Retrospectiva do ano"];
const EX_LIBRIS = ["Tudo do Capa Dura", "Clubes de leitura privados", "Citação por foto da página, sem limite", "Temas e selo Ex Libris"];

const ERRORS: Record<BillingError, string> = {
  unauthenticated: "Entre na sua conta para assinar.",
  unavailable: "Não foi possível abrir o pagamento agora. Tente de novo em instantes.",
  already_subscribed: "Você já tem uma assinatura ativa.",
  not_found: "Não encontramos uma assinatura nesta conta.",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export function PlansPage() {
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<{ status: PlanStatus | null; enabled: boolean } | null>(null);
  const [interval, setPeriod] = useState<"month" | "year">("year");
  const [busy, setBusy] = useState(false);
  const synced = useRef(false);
  const session = params.get("sessao");
  const userId = auth.status === "user" ? auth.profile.id : null;

  useEffect(() => {
    if (auth.status === "loading") return;
    // Volta do checkout: confirma direto no Stripe antes de mostrar o plano.
    if (session && userId && !synced.current) {
      synced.current = true;
      void syncCheckoutAction(session).then((r) => {
        if (r.ok && r.status.plan !== "brochura") toast("Bem-vindo ao Capa Dura", { description: "Citações, notas e discussões sem limite." });
        router.replace("/planos");
        void getPlanStatus().then(setData);
      });
      return;
    }
    void getPlanStatus().then(setData);
  }, [auth.status, userId, session, router]);

  async function subscribe() {
    setBusy(true);
    const r = await startCheckoutAction(interval).catch(() => ({ ok: false as const, error: "unavailable" as BillingError }));
    if (r.ok) {
      window.location.href = r.url;
      return;
    }
    setBusy(false);
    toast.error(ERRORS[r.error]);
  }

  async function manage() {
    setBusy(true);
    const r = await openPortalAction().catch(() => ({ ok: false as const, error: "unavailable" as BillingError }));
    if (r.ok) {
      window.location.href = r.url;
      return;
    }
    setBusy(false);
    toast.error(ERRORS[r.error]);
  }

  const plan = data?.status?.plan ?? "brochura";
  const subscribed = plan !== "brochura";

  return (
    <div>
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-anil">Planos</p>
        <h1 className="mt-1 text-hero font-semibold tracking-tight text-ink">Leia mais, guarde tudo.</h1>
        <p className="mt-3 text-lg text-ink-2">
          A Estante é grátis para registrar, avaliar e seguir leitores. O Capa Dura tira os limites das suas anotações e discussões.
        </p>
      </div>

      {subscribed && data?.status && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-musgo/30 bg-musgo-soft p-5">
          <div>
            <p className="font-semibold text-musgo">Você assina o Capa Dura{data.status.interval === "year" ? " anual" : " mensal"}</p>
            <p className="mt-0.5 text-sm text-ink-2">
              {data.status.canceling
                ? `Cancelado: o plano vale até ${formatDate(data.status.periodEnd!)} e não renova.`
                : data.status.status === "past_due"
                  ? "A última cobrança falhou. Atualize o cartão para não perder o plano."
                  : data.status.periodEnd
                    ? `Renova em ${formatDate(data.status.periodEnd)}.`
                    : "Assinatura ativa."}
            </p>
          </div>
          <Button variant="secondary" onClick={manage} disabled={busy}>
            Gerenciar assinatura
          </Button>
        </div>
      )}

      <div className="mt-8 flex justify-center sm:justify-start">
        <div role="tablist" aria-label="Período" className="grid grid-cols-2 rounded-full bg-sunken p-1">
          {(["month", "year"] as const).map((i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={interval === i}
              onClick={() => setPeriod(i)}
              className={cn("h-9 rounded-full px-5 text-sm font-medium transition-colors", interval === i ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink")}
            >
              {i === "month" ? "Mensal" : "Anual"}
              {i === "year" && <span className="ml-1.5 text-xs text-musgo">-28%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Brochura */}
        <section className="flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-ink">Brochura</h2>
          <p className="mt-1 text-sm text-ink-3">Para todo leitor, para sempre.</p>
          <p className="mt-5 text-4xl font-semibold tracking-tight text-ink">Grátis</p>
          <Features items={BROCHURA} />
          <div className="mt-auto pt-6">
            {auth.status === "user" ? (
              <Button variant="secondary" className="w-full" disabled>
                {subscribed ? "Incluído no seu plano" : "Seu plano atual"}
              </Button>
            ) : (
              <Button variant="secondary" className="w-full" nativeButton={false} render={<Link href="/entrar?next=/planos" />}>
                Criar conta grátis
              </Button>
            )}
          </div>
        </section>

        {/* Capa Dura */}
        <section className="relative flex flex-col rounded-3xl border-2 border-anil bg-surface p-6 shadow-card">
          <span className="absolute -top-3 left-6 rounded-full bg-anil px-3 py-1 text-xs font-semibold text-on-brand">Recomendado</span>
          <h2 className="text-lg font-semibold text-ink">Capa Dura</h2>
          <p className="mt-1 text-sm text-ink-3">Para quem anota tudo e puxa conversa.</p>
          <p className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight text-ink">{PRICE[interval].value}</span>
            <span className="text-ink-3">{PRICE[interval].per}</span>
          </p>
          <p className="mt-1 text-xs text-ink-4">{interval === "year" ? "Equivale a R$ 4,92 por mês." : "Ou R$ 59 no plano anual."}</p>
          <Features items={CAPA_DURA} />
          <p className="mt-4 text-xs font-medium tracking-wide text-ink-4 uppercase">Em breve no Capa Dura</p>
          <Features items={CAPA_DURA_SOON} soft />
          <div className="mt-auto pt-6">
            {!data ? (
              <Skeleton className="h-10 rounded-full" />
            ) : subscribed ? (
              <Button className="w-full" onClick={manage} disabled={busy}>
                Gerenciar assinatura
              </Button>
            ) : auth.status !== "user" ? (
              <Button className="w-full" nativeButton={false} render={<Link href="/entrar?next=/planos" />}>
                Entrar para assinar
              </Button>
            ) : !data.enabled ? (
              <Button className="w-full" disabled>
                Em breve
              </Button>
            ) : (
              <Button className="w-full" onClick={subscribe} disabled={busy}>
                {busy ? "Abrindo pagamento..." : `Assinar por ${PRICE[interval].value}${PRICE[interval].per}`}
              </Button>
            )}
          </div>
        </section>

        {/* Ex Libris */}
        <section className="flex flex-col rounded-3xl border border-dashed border-line-strong bg-surface/60 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            Ex Libris <Sparkles className="size-4 text-ambar" aria-hidden />
          </h2>
          <p className="mt-1 text-sm text-ink-3">Para clubes e leitores de carteirinha.</p>
          <p className="mt-5 text-4xl font-semibold tracking-tight text-ink-3">Em breve</p>
          <Features items={EX_LIBRIS} soft />
        </section>
      </div>

      <div className="mt-10 max-w-3xl space-y-2 text-sm text-ink-3">
        <p>
          A assinatura renova sozinha no fim de cada período. Você cancela quando quiser em <strong className="font-medium text-ink-2">Gerenciar assinatura</strong>, e o
          plano continua valendo até o fim do período já pago.
        </p>
        <p>
          Mudou de ideia? Em até 7 dias da contratação você pode desistir e recebe o valor de volta (Código de Defesa do Consumidor, art. 49). Veja os{" "}
          <Link href="/termos" className="font-medium text-ink-2 hover:underline">
            Termos de uso
          </Link>
          .
        </p>
        <p>O pagamento é processado pelo Stripe. A Estante não vê nem guarda os dados do seu cartão.</p>
      </div>
    </div>
  );
}

function Features({ items, soft = false }: { items: string[]; soft?: boolean }) {
  return (
    <ul className="mt-5 grid gap-2.5 text-sm">
      {items.map((f) => (
        <li key={f} className={cn("flex gap-2", soft ? "text-ink-3" : "text-ink-2")}>
          <Check className={cn("mt-0.5 size-4 shrink-0", soft ? "text-ink-4" : "text-musgo")} aria-hidden />
          {f}
        </li>
      ))}
    </ul>
  );
}
