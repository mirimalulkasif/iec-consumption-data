import { NextResponse } from "next/server";
import { IecApiError, startLogin } from "@/lib/iec/client";
import { clearPendingCookie, setPendingCookie } from "@/lib/iec/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      idNumber?: string;
      preferSms?: boolean;
    };
    const pending = await startLogin(
      body.idNumber ?? "",
      body.preferSms !== false,
    );

    const res = NextResponse.json({
      ok: true,
      factorType: pending.factorType,
      message: `OTP sent via ${pending.factorType}. Enter the code to pull your meter.`,
    });
    res.cookies.set(clearPendingCookie());
    res.cookies.set(setPendingCookie(pending));
    return res;
  } catch (err) {
    const status = err instanceof IecApiError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Could not start IEC login";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
