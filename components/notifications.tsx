"use client";

import { Bell, BellOff, Check, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
  respondFollowRequest,
  type NotificationItem,
} from "@/app/social-actions";
import { FollowButton } from "@/components/follow-button";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth";
import { toISODate } from "@/lib/dates";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const POLL = 60_000;

/** Sininho do header. Só a contagem é buscada de tempos em tempos; a lista, só ao abrir. */
export function NotificationsBell() {
  const auth = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const loggedIn = auth.status === "user";

  const refreshCount = useCallback(() => {
    if (document.visibilityState === "visible") void getUnreadCount().then(setUnread).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    refreshCount();
    const timer = setInterval(refreshCount, POLL);
    const onVisible = () => refreshCount();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [loggedIn, refreshCount]);

  // Fecha ao navegar (clicar num perfil ou livro dentro do painel).
  useEffect(() => setOpen(false), [pathname]);

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    const data = await getNotifications(20).catch(() => null);
    setItems(data?.items ?? []);
    if (data?.unread) {
      setUnread(0);
      void markNotificationsRead();
    }
  }

  if (!loggedIn || pathname === "/notificacoes") {
    return loggedIn ? <BellLink unread={0} /> : null;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        aria-label={unread ? `Notificações, ${unread} ${unread === 1 ? "nova" : "novas"}` : "Notificações"}
        className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors outline-none hover:bg-sunken focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Bell className="size-[18px]" aria-hidden />
        {unread > 0 && (
          <span className="tnum absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ameixa px-1 text-[0.625rem] font-semibold text-on-brand ring-2 ring-canvas">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(24rem,calc(100vw-1.5rem))] rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-ink">Notificações</p>
          <Link href="/notificacoes" className="text-[0.8125rem] font-medium text-anil hover:text-anil-hover">
            Ver todas
          </Link>
        </div>
        <div className="max-h-[min(70vh,28rem)] overflow-y-auto">
          {items === null ? <ListSkeleton /> : <NotificationList items={items} onChange={setItems} compact />}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BellLink({ unread }: { unread: number }) {
  return (
    <Link
      href="/notificacoes"
      aria-label="Notificações"
      aria-current="page"
      className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sunken text-ink", unread && "text-ameixa")}
    >
      <Bell className="size-[18px]" aria-hidden />
    </Link>
  );
}

/** Página /notificacoes: a lista completa. */
export function NotificationsPage() {
  const auth = useAuth();
  const [items, setItems] = useState<NotificationItem[] | null>(null);

  useEffect(() => {
    if (auth.status !== "user") return;
    void getNotifications(100).then((d) => {
      setItems(d?.items ?? []);
      if (d?.unread) void markNotificationsRead();
    });
  }, [auth.status]);

  if (auth.status === "guest") {
    return (
      <div className="py-16 text-center">
        <p className="text-ink-3">Entre para ver suas notificações.</p>
        <Button className="mt-6" render={<Link href="/entrar?next=/notificacoes" />} nativeButton={false}>
          Entrar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-title font-semibold text-ink">Notificações</h1>
      <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-surface">
        {items === null ? <ListSkeleton /> : <NotificationList items={items} onChange={setItems} />}
      </div>
    </div>
  );
}

function NotificationList({
  items,
  onChange,
  compact,
}: {
  items: NotificationItem[];
  onChange: (items: NotificationItem[]) => void;
  compact?: boolean;
}) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <BellOff className="size-6 text-ink-4" aria-hidden />
        <p className="mt-3 text-sm text-ink-3">Nada por aqui ainda. Quando alguém seguir você ou curtir uma review, aparece aqui.</p>
      </div>
    );
  }

  async function respond(item: NotificationItem, accept: boolean) {
    onChange(items.map((i) => (i.id === item.id ? { ...i, pending: false, type: accept ? "follow" : i.type } : i)));
    const r = await respondFollowRequest(item.actor.handle, accept).catch(() => ({ ok: false }));
    if (!r.ok) toast.error("Não foi possível responder ao pedido");
    else toast(accept ? `@${item.actor.handle} agora segue você` : "Pedido recusado");
    if (!accept) onChange(items.filter((i) => i.id !== item.id));
  }

  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className={cn("flex gap-3 px-4 py-3.5", !item.read && "bg-anil-soft/40")}>
          <UserAvatar user={item.actor} size={38} />
          <div className="min-w-0 flex-1">
            <p className={cn("text-[0.875rem] leading-snug text-ink-2", compact && "text-[0.8125rem]")}>
              <Link href={`/u/${item.actor.handle}`} className="font-semibold text-ink hover:underline">
                {item.actor.name}
              </Link>{" "}
              <Message item={item} />
            </p>
            <p className="mt-0.5 text-xs text-ink-4">{formatRelative(toISODate(new Date(item.createdAt)))}</p>

            {item.type === "follow_request" && item.pending && (
              <div className="mt-2.5 flex gap-2">
                <Button size="sm" onClick={() => respond(item, true)}>
                  <Check data-icon="inline-start" /> Aceitar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => respond(item, false)}>
                  <X data-icon="inline-start" /> Recusar
                </Button>
              </div>
            )}
            {item.type === "follow" && (
              <div className="mt-2">
                <FollowButton handle={item.actor.handle} isPrivate={item.actor.isPrivate} size="sm" label="Seguir de volta" />
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Message({ item }: { item: NotificationItem }) {
  const book = item.bookId ? (
    <Link href={`/livro/${item.bookId}`} className="font-medium text-ink hover:underline">
      {item.bookTitle}
    </Link>
  ) : null;
  switch (item.type) {
    case "follow":
      return <>começou a seguir você.</>;
    case "follow_request":
      return item.pending ? <>pediu para seguir você.</> : <>teve o pedido respondido.</>;
    case "follow_accepted":
      return <>aceitou seu pedido para seguir.</>;
    case "review_like":
      return <>curtiu sua review de {book}.</>;
    case "friend_finished":
      return <>terminou {book}, que está na sua lista Quero ler.</>;
  }
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 p-4" aria-busy aria-label="Carregando">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="mt-2 h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
