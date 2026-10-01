"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

import { issueAppCodeAction } from "@/app/app-connect-actions";
import { Button } from "@/components/ui/button";

/** Botões da confirmação de /app/conectar: entrar no app, trocar de conta ou cancelar. */
export function AppConnectActions({ challenge, redirect, here }: { challenge: string; redirect: string; here: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function connect() {
    setBusy(true);
    setError(false);
    const r = await issueAppCodeAction(challenge, redirect).catch(() => ({ ok: false as const }));
    if (r.ok) {
      window.location.href = r.url;
      return;
    }
    setBusy(false);
    setError(true);
  }

  async function switchAccount() {
    setBusy(true);
    await signOut({ redirect: false });
    window.location.href = `/entrar?next=${encodeURIComponent(here)}`;
  }

  function cancel() {
    const url = new URL(redirect);
    url.searchParams.set("error", "cancelado");
    window.location.href = url.toString();
  }

  return (
    <div className="mt-8 grid gap-3">
      <Button size="lg" onClick={connect} disabled={busy}>
        Entrar no app
      </Button>
      <Button size="lg" variant="secondary" onClick={switchAccount} disabled={busy}>
        Usar outra conta
      </Button>
      <Button variant="ghost" onClick={cancel} disabled={busy} className="text-ink-3">
        Cancelar
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          Não deu para entrar. Volte ao app e tente de novo.
        </p>
      )}
    </div>
  );
}
