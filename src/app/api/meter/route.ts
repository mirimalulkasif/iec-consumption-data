import { NextResponse } from "next/server";
import { mockMeterPayload } from "@/lib/mock-data";
import { fetchLiveMeterData, RymProError } from "@/lib/rympro";

export const dynamic = "force-dynamic";

export async function GET() {
  const email = process.env.RYM_EMAIL;
  const password = process.env.RYM_PASSWORD;

  if (email && password) {
    try {
      const live = await fetchLiveMeterData(email, password);
      return NextResponse.json(live);
    } catch (error) {
      const message =
        error instanceof RymProError
          ? error.message
          : "Could not reach Read Your Meter Pro";
      return NextResponse.json(
        {
          ...mockMeterPayload,
          fetchedAt: new Date().toISOString(),
          message: `Live credentials failed (${message}). Showing sample data.`,
        },
        { status: 200 },
      );
    }
  }

  return NextResponse.json({
    ...mockMeterPayload,
    fetchedAt: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  try {
    const live = await fetchLiveMeterData(email, password);
    return NextResponse.json(live);
  } catch (error) {
    if (error instanceof RymProError) {
      const status = error.code === "unauthorized" ? 401 : 502;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: "Unexpected error talking to Read Your Meter Pro" },
      { status: 502 },
    );
  }
}
