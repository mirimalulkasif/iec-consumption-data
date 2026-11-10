import { createHmac, timingSafeEqual } from "crypto";
import type { IecTokens, PendingLogin } from "./types";

const COOKIE_PENDING = "iec_pending";
const COOKIE_TOKENS = "iec_tokens";

function secret() {
  return (
    process.env.IEC_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "iec-daily-dev-secret-change-me"
  );
}

function encode(payload: unknown) {
  const json = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(json).digest("base64url");
  return `${json}.${sig}`;
}

function decode<T>(value: string | undefined): T | null {
  if (!value) return null;
  const [json, sig] = value.split(".");
  if (!json || !sig) return null;
  const expected = createHmac("sha256", secret()).update(json).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function setPendingCookie(pending: PendingLogin) {
  return {
    name: COOKIE_PENDING,
    value: encode(pending),
    ...cookieOptions(10 * 60),
  };
}

export function clearPendingCookie() {
  return {
    name: COOKIE_PENDING,
    value: "",
    ...cookieOptions(0),
  };
}

export function readPendingCookie(raw: string | undefined) {
  const pending = decode<PendingLogin>(raw);
  if (!pending) return null;
  if (Date.now() - pending.createdAt > 10 * 60 * 1000) return null;
  return pending;
}

export function setTokensCookie(tokens: IecTokens) {
  return {
    name: COOKIE_TOKENS,
    value: encode(tokens),
    ...cookieOptions(30 * 24 * 60 * 60),
  };
}

export function clearTokensCookie() {
  return {
    name: COOKIE_TOKENS,
    value: "",
    ...cookieOptions(0),
  };
}

export function readTokensCookie(raw: string | undefined) {
  return decode<IecTokens>(raw);
}

export const cookieNames = {
  pending: COOKIE_PENDING,
  tokens: COOKIE_TOKENS,
};
