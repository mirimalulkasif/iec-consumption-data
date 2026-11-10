import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ensureFreshTokens,
  fetchDailyReadings,
  IecApiError,
} from "@/lib/iec/client";
import { mockReadings } from "@/lib/iec/mock";
import {
  clearTokensCookie,
  cookieNames,
  readTokensCookie,
  setTokensCookie,
} from "@/lib/iec/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wantMock =
    url.searchParams.get("demo") === "1" ||
    process.env.IEC_MOCK === "1";

  if (wantMock) {
    return NextResponse.json({ ok: true, data: mockReadings() });
  }

  try {
    const jar = await cookies();
    const existing = readTokensCookie(jar.get(cookieNames.tokens)?.value);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Not signed in", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const tokens = await ensureFreshTokens(existing);
    const data = await fetchDailyReadings(tokens, 2);

    const res = NextResponse.json({ ok: true, data });
    if (tokens !== existing) {
      res.cookies.set(setTokensCookie(tokens));
    }
    return res;
  } catch (err) {
    const status = err instanceof IecApiError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Could not pull IEC readings";
    const res = NextResponse.json(
      { ok: false, error: message },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
    if (status === 401) {
      res.cookies.set(clearTokensCookie());
    }
    return res;
  }
}
