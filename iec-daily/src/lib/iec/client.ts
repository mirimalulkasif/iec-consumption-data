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
const FETCH_TIMEOUT_MS = 20_000;

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
  details?: unknown;
  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "IecApiError";
    this.status = status;
    this.details = details;
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
  factors: Array<{
    id: string;
    factorType?: string;
    profile?: { email?: string };
  }>,
  preferSms = true,
) {
  if (!factors.length) {
    throw new IecApiError("No IEC login factors found for this ID");
  }
  if (!preferSms) return factors[0];
  return factors.find((f) => factorLabel(f) === "sms") ?? factors[0];
}

/** IEC APIs expect unpadded numeric IDs (HA does str(int(...))). */
function normalizeNumericId(value: string | number) {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return String(value);
  // Keep as decimal string without leading zeros, but never empty
  const normalized = digits.replace(/^0+(?=\d)/, "");
  return normalized || "0";
}

async function iecFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new IecApiError(`IEC request timed out after ${timeoutMs / 1000}s`, 504);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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
        : typeof body === "object" &&
            body &&
            "title" in body &&
            typeof (body as { title?: string }).title === "string"
          ? (body as { title: string }).title
          : `IEC request failed (${res.status})`;
    throw new IecApiError(summary, res.status, body);
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

  const authn = await iecFetch(`${OKTA}/api/v1/authn`, {
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
      factors?: Array<{
        id: string;
        factorType?: string;
        profile?: { email?: string };
      }>;
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
  const verify = await iecFetch(
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

  const res = await iecFetch(
    url,
    { headers: { accept: "text/html,application/xhtml+xml" }, redirect: "manual" },
    25_000,
  );
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
  const res = await iecFetch(`${OKTA}/oauth2/default/v1/token`, {
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

  const verify = await iecFetch(
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
  const res = await iecFetch(`${OKTA}/oauth2/default/v1/token`, {
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
  const res = await iecFetch(`${IEC_API}/customer`, {
    headers: authHeaders(idToken),
  });
  return (await readJson(res)) as {
    bpNumber: string;
    firstName?: string;
    lastName?: string;
    idNumber?: string;
  };
}

async function getContracts(
  idToken: string,
  bpNumber: string,
): Promise<IecContract[]> {
  const res = await iecFetch(
    `${IEC_API}/customer/contract/${normalizeNumericId(bpNumber)}`,
    { headers: authHeaders(idToken) },
  );
  const json = (await readJson(res)) as {
    data?: {
      contracts?: Array<{
        contractId: string | number;
        address?: string;
        cityName?: string;
        smartMeter?: boolean;
        producerType?: number;
      }>;
    };
    reponseDescriptor?: { isSuccess?: boolean; description?: string };
  };
  return (json.data?.contracts ?? []).map((c) => ({
    contractId: normalizeNumericId(c.contractId),
    address: c.address ?? "",
    cityName: c.cityName ?? "",
    smartMeter: Boolean(c.smartMeter),
    producerType: c.producerType ?? 0,
  }));
}

async function getDevicesFromDeviceIn(
  idToken: string,
  contractId: string,
): Promise<IecDevice[]> {
  const res = await iecFetch(`${IEC_API}/DeviceIn/${contractId}`, {
    headers: authHeaders(idToken),
  });
  const json = (await readJson(res)) as {
    status?: number;
    devices?: Array<{
      isActive?: boolean;
      deviceType?: number;
      deviceNumber?: string;
      deviceCode?: string | number;
      meterKind?: string;
    }>;
  };
  return (json.devices ?? [])
    .filter((d) => d.deviceNumber && d.deviceCode != null && d.deviceCode !== "")
    .map((d) => ({
      isActive: Boolean(d.isActive),
      deviceType: d.deviceType ?? null,
      deviceNumber: String(d.deviceNumber),
      deviceCode: String(d.deviceCode),
      meterKind: d.meterKind || "Consumption",
    }));
}

async function getDevicesFallback(
  idToken: string,
  contractId: string,
  meterKind: string,
): Promise<IecDevice[]> {
  const res = await iecFetch(`${IEC_API}/Device/${contractId}`, {
    headers: authHeaders(idToken),
  });
  const json = (await readJson(res)) as Array<{
    isActive?: boolean;
    deviceType?: number;
    deviceNumber?: string;
    deviceCode?: string | number;
  }>;
  return (Array.isArray(json) ? json : [])
    .filter((d) => d.deviceNumber && d.deviceCode != null && d.deviceCode !== "")
    .map((d) => ({
      isActive: Boolean(d.isActive),
      deviceType: d.deviceType ?? null,
      deviceNumber: String(d.deviceNumber),
      deviceCode: String(d.deviceCode),
      meterKind,
    }));
}

async function getLastInvoiceDate(
  idToken: string,
  bpNumber: string,
  contractId: string,
): Promise<string | null> {
  try {
    const res = await iecFetch(
      `${IEC_API}/BillingCollection/invoices/${normalizeNumericId(bpNumber)}/${contractId}`,
      { headers: authHeaders(idToken) },
    );
    const json = (await readJson(res)) as {
      data?: {
        invoices?: Array<{
          documentID?: string;
          fullDate?: string;
          toDate?: string;
          fromDate?: string;
        }>;
      };
    };
    const invoices = json.data?.invoices ?? [];
    // Prefer electric invoices (documentID "1"), else newest with a date
    const electric = invoices.filter((i) => String(i.documentID) === "1");
    const pool = electric.length ? electric : invoices;
    let best: string | null = null;
    for (const inv of pool) {
      const raw = inv.toDate || inv.fullDate || inv.fromDate;
      if (!raw) continue;
      const day = raw.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      if (!best || day > best) best = day;
    }
    return best;
  } catch {
    return null;
  }
}

function mapMeterKind(raw: string | undefined, producerType: number) {
  if (producerType === 1) return "Backstream";
  const value = (raw ?? "Consumption").trim();
  if (!value) return "Consumption";
  if (/^\d+$/.test(value)) return Number(value) === 2 ? "Backstream" : "Consumption";
  const lower = value.toLowerCase();
  if (value === "צריכה" || lower === "consumption") return "Consumption";
  if (value.includes("דו") || lower === "backstream") return "Backstream";
  return "Consumption";
}

function jerusalemYmd(date = new Date()) {
  // en-CA → YYYY-MM-DD in Asia/Jerusalem
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function firstOfMonthJerusalem(monthsAgo = 0) {
  const today = jerusalemYmd();
  const [y, m] = today.split("-").map(Number);
  const totalMonths = y * 12 + (m - 1) - monthsAgo;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function toDayKey(interval: string) {
  const m = interval.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

type RemoteReadingResponse = {
  reportStatus?: number;
  reportStatusText?: string;
  meterList?: Array<{
    meterSerial?: string;
    meterCode?: string;
    periodConsumptions?: Array<{
      interval: string;
      consumption: number;
      status?: number;
    }>;
    totalConsumptionForPeriod?: number;
  }>;
};

async function remoteReadingRange(opts: {
  idToken: string;
  contractId: string;
  meterSerial: string;
  meterCode: string;
  meterKind: string;
  fromDate: string;
  lastInvoiceDate: string;
  resolution: number;
}): Promise<RemoteReadingResponse> {
  const res = await iecFetch(
    `${IEC_API}/Consumption/RemoteReadingRange/${opts.contractId}`,
    {
      method: "POST",
      headers: authHeaders(opts.idToken),
      body: JSON.stringify({
        contractNumber: opts.contractId,
        // HA: lastInvoiceDate defaults to fromDate — never a synthetic 2000-01-01
        lastInvoiceDate: opts.lastInvoiceDate,
        fromDate: opts.fromDate,
        resolution: opts.resolution,
        smartMetersList: [
          {
            meterKind: opts.meterKind,
            meterCode: String(opts.meterCode),
            meterSerial: String(opts.meterSerial),
          },
        ],
      }),
    },
    // IEC often takes 20–40s on RemoteReadingRange; abort before the ~60s gateway cut
    50_000,
  );
  return (await readJson(res)) as RemoteReadingResponse;
}

function ingestPeriods(
  byDay: Map<string, number>,
  reading: RemoteReadingResponse,
) {
  let count = 0;
  for (const meter of reading.meterList ?? []) {
    for (const period of meter.periodConsumptions ?? []) {
      const day = toDayKey(period.interval);
      if (!day) continue;
      // MONTHLY → one row per day. DAILY → many intervals per day; sum them.
      byDay.set(day, (byDay.get(day) ?? 0) + Number(period.consumption ?? 0));
      count += 1;
    }
  }
  return count;
}

export async function fetchDailyReadings(
  tokens: IecTokens,
  monthsBack = 2,
): Promise<ReadingsResult> {
  const customer = await getCustomer(tokens.idToken);
  const bpNumber = normalizeNumericId(customer.bpNumber);
  const contracts = await getContracts(tokens.idToken, bpNumber);
  if (!contracts.length) {
    throw new IecApiError("No IEC contracts found on this account");
  }

  const contract = contracts.find((c) => c.smartMeter) ?? contracts[0];
  const contractId = normalizeNumericId(contract.contractId);

  let devices: IecDevice[] = [];
  try {
    devices = await getDevicesFromDeviceIn(tokens.idToken, contractId);
  } catch {
    devices = [];
  }
  if (!devices.length) {
    devices = await getDevicesFallback(
      tokens.idToken,
      contractId,
      mapMeterKind(undefined, contract.producerType ?? 0),
    );
  }

  const device =
    devices.find((d) => d.isActive && d.deviceNumber && d.deviceCode) ??
    devices[0];
  if (!device?.deviceNumber || !device.deviceCode) {
    throw new IecApiError(
      "No smart meter device found on this contract. Remote reading needs an electronic meter.",
    );
  }

  const meterKind = mapMeterKind(
    device.meterKind,
    contract.producerType ?? 0,
  );

  const warnings: string[] = [];
  if (!contract.smartMeter) {
    warnings.push(
      "Contract is not flagged as smartMeter — remote reading may be empty or delayed.",
    );
  }

  const invoiceDate = await getLastInvoiceDate(
    tokens.idToken,
    bpNumber,
    contractId,
  );

  const byDay = new Map<string, number>();
  const monthStarts: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    monthStarts.push(firstOfMonthJerusalem(i));
  }

  // Fetch months in parallel (wall clock ≈ one slow IEC call, not N×)
  const results = await Promise.allSettled(
    monthStarts.map(async (fromDate) => {
      const lastInvoiceDate = invoiceDate ?? fromDate;
      const reading = await remoteReadingRange({
        idToken: tokens.idToken,
        contractId,
        meterSerial: device.deviceNumber,
        meterCode: device.deviceCode,
        meterKind,
        fromDate,
        lastInvoiceDate,
        resolution: ReadingResolution.MONTHLY,
      });

      if (!(reading.meterList ?? []).length) {
        throw new Error(
          reading.reportStatusText ||
            `No meterList for ${fromDate} (status ${reading.reportStatus ?? "?"})`,
        );
      }

      const partial = new Map<string, number>();
      const count = ingestPeriods(partial, reading);
      if (!count) {
        throw new Error(`Empty periodConsumptions for ${fromDate}`);
      }
      return partial;
    }),
  );

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      for (const [date, kwh] of result.value) {
        byDay.set(date, (byDay.get(date) ?? 0) + kwh);
      }
    } else {
      const reason =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      warnings.push(`${monthStarts[index]}: ${reason}`);
    }
  });

  // Fallback: if MONTHLY came back empty, try DAILY for today (HA does this too)
  if (!byDay.size) {
    const today = jerusalemYmd();
    try {
      const daily = await remoteReadingRange({
        idToken: tokens.idToken,
        contractId,
        meterSerial: device.deviceNumber,
        meterCode: device.deviceCode,
        meterKind,
        fromDate: today,
        lastInvoiceDate: invoiceDate ?? today,
        resolution: ReadingResolution.DAILY,
      });
      const count = ingestPeriods(byDay, daily);
      if (count) {
        warnings.push(
          "Monthly remote reading was empty; showing today’s DAILY intervals summed to kWh.",
        );
      } else {
        warnings.push(
          `Daily fallback for ${today} also returned no periodConsumptions.`,
        );
      }
    } catch (err) {
      warnings.push(
        `Daily fallback: ${err instanceof Error ? err.message : String(err)}`,
      );
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
      [
        "IEC returned no daily readings.",
        `contract ${contractId}, meter ${device.deviceNumber}/${device.deviceCode}, kind ${meterKind}.`,
        warnings[0] ?? "Smart-meter data often lags by ~1–2 days.",
      ].join(" "),
      400,
      { warnings, contractId, meter: device, meterKind, invoiceDate },
    );
  }

  const totalKwh =
    Math.round(days.reduce((sum, d) => sum + d.kwh, 0) * 1000) / 1000;

  return {
    days,
    totalKwh,
    dateFrom: days[0].date,
    dateTo: days[days.length - 1].date,
    contractId,
    meterSerial: device.deviceNumber,
    customerName:
      [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
      customer.idNumber ||
      "IEC account",
    warnings,
    source: "iec",
  };
}
