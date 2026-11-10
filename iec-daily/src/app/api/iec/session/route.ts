import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieNames, readPendingCookie, readTokensCookie } from "@/lib/iec/session";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const tokens = readTokensCookie(jar.get(cookieNames.tokens)?.value);
  const pending = readPendingCookie(jar.get(cookieNames.pending)?.value);

  return NextResponse.json({
    ok: true,
    signedIn: Boolean(tokens),
    awaitingOtp: Boolean(pending),
    factorType: pending?.factorType ?? null,
  });
}
