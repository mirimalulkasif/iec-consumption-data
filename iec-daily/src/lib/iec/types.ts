export type IecTokens = {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
  obtainedAt: number;
};

export type PendingLogin = {
  stateToken: string;
  factorId: string;
  factorType: string;
  idNumber: string;
  createdAt: number;
};

export type IecDevice = {
  isActive: boolean;
  deviceType: number | null;
  deviceNumber: string;
  deviceCode: string;
  meterKind?: string;
};

export type IecContract = {
  contractId: string;
  address: string;
  cityName: string;
  smartMeter: boolean;
  producerType?: number;
};

export type DailyRow = {
  date: string;
  kwh: number;
};

export type ReadingsResult = {
  days: DailyRow[];
  /** Most recent day in the result (usually latest available from IEC). */
  latest: DailyRow | null;
  totalKwh: number;
  dateFrom: string;
  dateTo: string;
  /** Requested filter range (may be wider than days that IEC returned). */
  requestedFrom: string | null;
  requestedTo: string | null;
  contractId: string;
  meterSerial: string;
  customerName: string;
  warnings: string[];
  source: "iec" | "mock";
};

export type ReadingsQuery = {
  /** Inclusive YYYY-MM-DD */
  from?: string;
  /** Inclusive YYYY-MM-DD */
  to?: string;
  /** Used when from/to are omitted — how many calendar months to pull. */
  monthsBack?: number;
};

export const ReadingResolution = {
  DAILY: 1,
  WEEKLY: 2,
  MONTHLY: 3,
} as const;
