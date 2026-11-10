import { NextResponse } from "next/server";
import { clearPendingCookie, clearTokensCookie } from "@/lib/iec/session";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearPendingCookie());
  res.cookies.set(clearTokensCookie());
  return res;
}
