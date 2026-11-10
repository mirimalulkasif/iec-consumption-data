import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { IecApiError, verifyOtp } from "@/lib/iec/client";
import {
  clearPendingCookie,
  cookieNames,
  readPendingCookie,
  setTokensCookie,
} from "@/lib/iec/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const jar = await cookies();
    const pending = readPendingCookie(jar.get(cookieNames.pending)?.value);
    if (!pending) {
      return NextResponse.json(
        { ok: false, error: "Login expired. Enter your ID again to send a new OTP." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { otp?: string };
    const tokens = await verifyOtp(pending, body.otp ?? "");

    const res = NextResponse.json({
      ok: true,
      message: "Signed in. Pulling daily kWh from IEC…",
    });
    res.cookies.set(clearPendingCookie());
    res.cookies.set(setTokensCookie(tokens));
    return res;
  } catch (err) {
    const status = err instanceof IecApiError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "OTP verification failed";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
