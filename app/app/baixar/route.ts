import { NextResponse } from "next/server";

import { APP_DOWNLOAD_URL } from "@/lib/app-release";

/** Endereço curto para divulgar (estante-pink.vercel.app/app/baixar): leva ao APK mais novo. */
export function GET() {
  return NextResponse.redirect(APP_DOWNLOAD_URL, 302);
}
