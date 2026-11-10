import { createHash, randomBytes } from "crypto";
import {
  ReadingResolution,
  type DailyRow,
  type IecContract,
  type IecDevice,
  type IecTokens,
  type PendingLogin,
  type ReadingsResult,
} from "./types";

const IEC_API = "https://iecapi.iec.co.il/api";
const OKTA = "https://iec-ext.okta.com";
const CLIENT_ID = process.env.IEC_CLIENT_ID ?? "0oaqf6zr7yEcQZqqt2p7";
const REDIRECT_URI = process.env.IEC_REDIRECT_URI ?? "com.iecrn:/";

const BROWSER_HEADERS: Record<string, string> = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en,he;q=0.9",
  origin: "https://www.iec.co.il",
  referer: "https://www.iec.co.il/",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "x-iec-idt": "1",
  "x-iec-webview": "1",
};

export class IecApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "IecApiError";
    this.status = status;
  }
}

function b64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function pkcePair() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

function factorLabel(factor: {
  factorType?: string;
  profile?: { email?: string };
}) {
  const type = factor.factorType ?? "otp";
  const email = factor.profile?.email ?? "";
  if (type === "email" && email.includes("@sns.iec.co.il")) return "sms";
  return type;
}

function pickFactor(
  factors: Array<{ id: string; factorType?: string; profile?: { email?: string } }>,
  preferSms = true,
) {
  if (!factors.length) throw new IecApiError("No IEC login factors found for this ID");
  if (!preferSms) return factors[0];
  return factors.find((f) => factorLabel(f) === "sms") ?? factors[0];
}

async function readJson(res: Response) {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const summary =
      typeof body === "object" &&
      body &&
      "errorSummary" in body &&
      typeof (body as { errorSummary?: string }).errorSummary === "string"
        ? (body as { errorSummary: string }).errorSummary
        : `IEC request failed (${res.status})`;
    throw new IecApiError(summary, res.status);
  }
  return body;
}

function authHeaders(idToken: string): Record<string, string> {
  return {
    ...BROWSER_HEADERS,
    authorization: `Bearer ${idToken}`,
    "content-type": "application/json",
  };
}

export async function startLogin(
  idNumber: string,
  preferSms = true,
): Promise<PendingLogin> {
  const cleanId = idNumber.replace(/\D/g, "");
  if (cleanId.length < 5) {
    throw new IecApiError("Enter a valid Israeli ID number");
  }

  const authn = await fetch(`${OKTA}/api/v1/authn`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ username: cleanId }),
  });
  const authnBody = (await readJson(authn)) as {
    stateToken?: string;
    status?: string;
    _embedded?: {
      factors?: Array<{ id: string; factorType?: string; profile?: { email?: string } }>;
    };
  };

  const stateToken = authnBody.stateToken;
  const factors = authnBody._embedded?.factors ?? [];
  if (!stateToken || !factors.length) {
    throw new IecApiError(
      "IEC did not start OTP login. Check the ID number is registered on iec.co.il.",
    );
  }

  const factor = pickFactor(factors, preferSms);
  const verify = await fetch(
    `${OKTA}/api/v1/authn/factors/${factor.id}/verify`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ stateToken }),
    },
  );
  await readJson(verify);

  return {
    stateToken,
    factorId: factor.id,
    factorType: factorLabel(factor),
    idNumber: cleanId,
    createdAt: Date.now(),
  };
}

async function authorizeSession(sessionToken: string) {
  const { verifier, challenge } = pkcePair();
  const state = b64url(randomBytes(9));
  const url =
    `${OKTA}/oauth2/default/v1/authorize?` +
    new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "id_token code",
      response_mode: "form_post",
      scope: "openid email profile offline_access",
      redirect_uri: REDIRECT_URI,
      state,
      nonce: "iec-daily",
      code_challenge_method: "S256",
      sessionToken,
      code_challenge: challenge,
    }).toString();

  const res = await fetch(url, {
    headers: { accept: "text/html,application/xhtml+xml" },
    redirect: "manual",
  });
  const html = await res.text();
  const decoded = Buffer.from(html, "latin1").toString("utf8");
  const match = decoded.match(
    /<input type="hidden" name="code" value="([^"]+)"\s*\/>/,
  );
  if (!match?.[1]) {
    throw new IecApiError("IEC authorization did not return a code");
  }
  return { code: match[1], verifier };
}

async function exchangeCode(code: string, verifier: string): Promise<IecTokens> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
    code,
  });
  const res = await fetch(`${OKTA}/oauth2/default/v1/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await readJson(res)) as {
    access_token: string;
    refresh_token: string;
    id_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    idToken: json.id_token,
    tokenType: json.token_type,
    expiresIn: json.expires_in,
    scope: json.scope,
    obtainedAt: Date.now(),
  };
}

export async function verifyOtp(
  pending: PendingLogin,
  otpCode: string,
): Promise<IecTokens> {
  const code = otpCode.replace(/\D/g, "");
  if (code.length < 4) throw new IecApiError("Enter the OTP code from SMS/email");

  const verify = await fetch(
    `${OKTA}/api/v1/authn/factors/${pending.factorId}/verify`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        stateToken: pending.stateToken,
        passCode: code,
      }),
    },
  );
  const body = (await readJson(verify)) as {
    status?: string;
    sessionToken?: string;
  };
  if (!body.sessionToken) {
    throw new IecApiError("OTP verification failed — try again with a fresh code");
  }

  const { code: authCode, verifier } = await authorizeSession(body.sessionToken);
  return exchangeCode(authCode, verifier);
}

export async function refreshTokens(tokens: IecTokens): Promise<IecTokens> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    refresh_token: tokens.refreshToken,
    grant_type: "refresh_token",
    scope: "openid email profile offline_access",
  });
  const res = await fetch(`${OKTA}/oauth2/default/v1/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await readJson(res)) as {
    access_token: string;
    refresh_token?: string;
    id_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? tokens.refreshToken,
    idToken: json.id_token,
    tokenType: json.token_type,
    expiresIn: json.expires_in,
    scope: json.scope,
    obtainedAt: Date.now(),
  };
}

export async function ensureFreshTokens(tokens: IecTokens): Promise<IecTokens> {
  const ageMs = Date.now() - tokens.obtainedAt;
  const ttlMs = Math.max(30, tokens.expiresIn - 60) * 1000;
  if (ageMs < ttlMs) return tokens;
  return refreshTokens(tokens);
}

async function getCustomer(idToken: string) {
  const res = await fetch(`${IEC_API}/customer`, {
    headers: authHeaders(idToken),
  });
  return (await readJson(res)) as {
    bpNumber: string;
    firstName?: string;
    lastName?: string;
    idNumber?: string;
  };
}

async function getContracts(idToken: string, bpNumber: string): Promise<IecContract[]> {
  const res = await fetch(`${IEC_API}/customer/contract/${bpNumber}`, {
    headers: authHeaders(idToken),
  });
  const json = (await readJson(res)) as {
    data?: {
      contracts?: Array<{
        contractId: string;
        address?: string;
        cityName?: string;
        smartMeter?: boolean;
      }>;
    };
  };
  return (json.data?.contracts ?? []).map((c) => ({
    contractId: String(c.contractId),
    address: c.address ?? "",
    cityName: c.cityName ?? "",
    smartMeter: Boolean(c.smartMeter),
  }));
}

async function getDevices(idToken: string, contractId: string): Promise<IecDevice[]> {
  const res = await fetch(`${IEC_API}/Device/${contractId}`, {
    headers: authHeaders(idToken),
  });
  const json = (await readJson(res)) as Array<{
    isActive?: boolean;
    deviceType?: number;
    deviceNumber?: string;
    deviceCode?: string | number;
  }>;
  return (Array.isArray(json) ? json : []).map((d) => ({
    isActive: Boolean(d.isActive),
    deviceType: d.deviceType ?? null,
    deviceNumber: String(d.deviceNumber ?? ""),
    deviceCode: String(d.deviceCode ?? ""),
  }));
}

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function firstOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function toDayKey(interval: string) {
  // IEC returns ISO like 2023-07-20T00:00:00+00:00 — keep calendar date as IEC sent it
  const m = interval.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

async function remoteReadingRange(opts: {
  idToken: string;
  contractId: string;
  meterSerial: string;
  meterCode: string;
  fromDate: string;
  resolution: number;
}) {
  const res = await fetch(
    `${IEC_API}/Consumption/RemoteReadingRange/${opts.contractId}`,
    {
      method: "POST",
      headers: authHeaders(opts.idToken),
      body: JSON.stringify({
        contractNumber: opts.contractId,
        lastInvoiceDate: "2000-01-01",
        fromDate: opts.fromDate,
        resolution: opts.resolution,
        smartMetersList: [
          {
            meterKind: "Consumption",
            meterCode: opts.meterCode,
            meterSerial: opts.meterSerial,
          },
        ],
      }),
    },
  );
  return (await readJson(res)) as {
    reportStatus?: number;
    reportStatusText?: string;
    meterList?: Array<{
      meterSerial?: string;
      periodConsumptions?: Array<{
        interval: string;
        consumption: number;
        status?: number;
      }>;
      totalConsumptionForPeriod?: number;
    }>;
  };
}

export async function fetchDailyReadings(
  tokens: IecTokens,
  monthsBack = 2,
): Promise<ReadingsResult> {
  const customer = await getCustomer(tokens.idToken);
  const contracts = await getContracts(tokens.idToken, customer.bpNumber);
  if (!contracts.length) {
    throw new IecApiError("No IEC contracts found on this account");
  }

  const contract =
    contracts.find((c) => c.smartMeter) ?? contracts[0];

  const devices = await getDevices(tokens.idToken, contract.contractId);
  const device =
    devices.find((d) => d.isActive && d.deviceNumber) ?? devices[0];
  if (!device?.deviceNumber) {
    throw new IecApiError(
      "No smart meter device found on this contract. Remote reading needs an electronic meter.",
    );
  }

  const warnings: string[] = [];
  if (!contract.smartMeter) {
    warnings.push(
      "Contract is not flagged as smartMeter — remote reading may be empty or delayed.",
    );
  }

  const byDay = new Map<string, number>();
  const today = new Date();
  const monthStarts: Date[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    monthStarts.push(firstOfMonth(addMonths(today, -i)));
  }

  for (const start of monthStarts) {
    const fromDate = ymd(start);
    try {
      const reading = await remoteReadingRange({
        idToken: tokens.idToken,
        contractId: contract.contractId,
        meterSerial: device.deviceNumber,
        meterCode: device.deviceCode || "503",
        fromDate,
        // MONTHLY resolution returns one periodConsumption per day
        resolution: ReadingResolution.MONTHLY,
      });

      const meters = reading.meterList ?? [];
      if (!meters.length) {
        warnings.push(`No remote reading returned for ${fromDate}`);
        continue;
      }
      for (const meter of meters) {
        for (const period of meter.periodConsumptions ?? []) {
          const day = toDayKey(period.interval);
          if (!day) continue;
          const prev = byDay.get(day) ?? 0;
          byDay.set(day, prev + Number(period.consumption ?? 0));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Remote reading failed";
      warnings.push(`${fromDate}: ${msg}`);
    }
  }

  const days: DailyRow[] = [...byDay.entries()]
    .map(([date, kwh]) => ({
      date,
      kwh: Math.round(kwh * 1000) / 1000,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!days.length) {
    throw new IecApiError(
      warnings[0] ??
        "IEC returned no daily readings. Smart-meter data often lags by ~1–2 days.",
    );
  }

  const totalKwh =
    Math.round(days.reduce((sum, d) => sum + d.kwh, 0) * 1000) / 1000;

  return {
    days,
    totalKwh,
    dateFrom: days[0].date,
    dateTo: days[days.length - 1].date,
    contractId: contract.contractId,
    meterSerial: device.deviceNumber,
    customerName:
      [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
      customer.idNumber ||
      "IEC account",
    warnings,
    source: "iec",
  };
}
