import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { blocks, entries, followRequests, follows, notifications, passwordLogins, profiles, reviewReactions } from "@/lib/db/schema";
import { currentProfileId } from "@/lib/session";

/**
 * Portabilidade (LGPD, art. 18, V): baixa todos os dados da conta em JSON.
 * Só a própria pessoa, pela sessão. O hash da senha nunca é exportado.
 */
export async function GET() {
  const me = await currentProfileId();
  if (!me || !db) return NextResponse.json({ error: "Entre na sua conta para baixar seus dados." }, { status: 401 });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, me) });
  if (!profile) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  const [shelf, following, followers, requests, blocked, reactions, notes, login] = await Promise.all([
    db.select().from(entries).where(eq(entries.userId, me)),
    db.select({ handle: profiles.handle, since: follows.createdAt }).from(follows).innerJoin(profiles, eq(follows.followingId, profiles.id)).where(eq(follows.followerId, me)),
    db.select({ handle: profiles.handle, since: follows.createdAt }).from(follows).innerJoin(profiles, eq(follows.followerId, profiles.id)).where(eq(follows.followingId, me)),
    db.select().from(followRequests).where(or(eq(followRequests.requesterId, me), eq(followRequests.targetId, me))),
    db.select({ handle: profiles.handle, since: blocks.createdAt }).from(blocks).innerJoin(profiles, eq(blocks.blockedId, profiles.id)).where(eq(blocks.blockerId, me)),
    db.select().from(reviewReactions).where(eq(reviewReactions.userId, me)),
    db.select().from(notifications).where(eq(notifications.recipientId, me)),
    db.select({ email: passwordLogins.email, createdAt: passwordLogins.createdAt }).from(passwordLogins).where(eq(passwordLogins.profileId, me)),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    profile: {
      handle: profile.handle,
      name: profile.name,
      bio: profile.bio,
      goal: profile.goal,
      tone: profile.tone,
      isPrivate: profile.isPrivate,
      favorites: profile.favorites,
      socials: profile.socials,
      loginProvider: profile.providerId.split(":")[0],
      createdAt: profile.createdAt,
    },
    passwordLogin: login[0] ?? null,
    shelf,
    following,
    followers,
    followRequests: requests,
    blocked,
    reviewReactions: reactions,
    notifications: notes,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="estante-${profile.handle}.json"`,
      "cache-control": "no-store",
    },
  });
}
