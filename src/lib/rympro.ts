const BASE_URL = "https://eu-customerportal-api.harmonyencoremdm.com";
const CONSUMER_URL = `${BASE_URL}/consumer`;
const CONSUMPTION_URL = `${BASE_URL}/consumption`;

export type MeterReading = {
  meterCount: number;
  meterSerial?: string;
  address?: string;
  lastRead: number;
  readDate?: string;
  dailyConsumption: number;
  monthlyConsumption: number;
  forecast: number;
};

export type MeterPayload = {
  source: "live" | "mock";
  accountNumber?: string | number;
  accountName?: string;
  fetchedAt: string;
  meters: MeterReading[];
  message?: string;
};

export class RymProError extends Error {
  constructor(
    message: string,
    public code: "unauthorized" | "cannot_connect" | "operation",
  ) {
    super(message);
    this.name = "RymProError";
  }
}

async function login(email: string, password: string, deviceId: string) {
  const response = await fetch(`${CONSUMER_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, pw: password, deviceId }),
    cache: "no-store",
  });

  const json = (await response.json()) as {
    token?: string;
    code?: number;
    error?: string;
  };

  if (json.code === 5060) {
    throw new RymProError(json.error || "Invalid credentials", "unauthorized");
  }
  if (!json.token || json.code) {
    throw new RymProError(
      json.error || `Login failed (code ${json.code ?? response.status})`,
      "cannot_connect",
    );
  }
  return json.token;
}

async function getJson<T>(path: string, token: string): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      "x-access-token": token,
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new RymProError("Session expired", "unauthorized");
  }
  if (!response.ok) {
    throw new RymProError(`API error ${response.status}`, "operation");
  }
  return (await response.json()) as T;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchLiveMeterData(
  email: string,
  password: string,
): Promise<MeterPayload> {
  const token = await login(email, password, "arad-meter-access");
  const account = await getJson<{
    accountNumber?: string | number;
    firstName?: string;
    lastName?: string;
    email?: string;
  }>(`${CONSUMER_URL}/me`, token);

  const lastReads = await getJson<
    Array<{
      meterCount: number;
      meterSerial?: string;
      address?: string;
      readValue?: number;
      lastRead?: number;
      readDate?: string;
    }>
  >(`${CONSUMPTION_URL}/last-read`, token);

  const meters: MeterReading[] = await Promise.all(
    lastReads.map(async (meter) => {
      const id = meter.meterCount;
      const date = today();

      const [daily, monthly, forecast] = await Promise.all([
        getJson<Array<{ cons: number }>>(
          `${CONSUMPTION_URL}/daily/${id}/${date}/${date}`,
          token,
        ).catch(() => []),
        getJson<Array<{ cons: number }>>(
          `${CONSUMPTION_URL}/monthly/${id}/${date}/${date}`,
          token,
        ).catch(() => []),
        getJson<{ estimatedConsumption: number }>(
          `${CONSUMPTION_URL}/forecast/${id}`,
          token,
        ).catch(() => ({ estimatedConsumption: 0 })),
      ]);

      return {
        meterCount: id,
        meterSerial: meter.meterSerial,
        address: meter.address,
        lastRead: meter.readValue ?? meter.lastRead ?? 0,
        readDate: meter.readDate,
        dailyConsumption: daily[0]?.cons ?? 0,
        monthlyConsumption: monthly[0]?.cons ?? 0,
        forecast: forecast.estimatedConsumption ?? 0,
      };
    }),
  );

  return {
    source: "live",
    accountNumber: account.accountNumber,
    accountName:
      [account.firstName, account.lastName].filter(Boolean).join(" ") ||
      account.email,
    fetchedAt: new Date().toISOString(),
    meters,
  };
}
