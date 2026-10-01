import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { clubMembers } from "@/lib/db/schema";

/** A pessoa é membro do clube? (Quem criou também é.) */
export async function isClubMember(profileId: string | null, clubId: string): Promise<boolean> {
  if (!profileId || !db) return false;
  const row = await db.query.clubMembers.findFirst({
    where: and(eq(clubMembers.clubId, clubId), eq(clubMembers.profileId, profileId)),
    columns: { role: true },
  });
  return Boolean(row);
}
