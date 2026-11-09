import type { MeterPayload } from "@/lib/rympro";

export const mockMeterPayload: MeterPayload = {
  source: "mock",
  accountNumber: "demo-48291",
  accountName: "Sample household",
  fetchedAt: new Date().toISOString(),
  message:
    "Sample data only. If your utility blocked Read Your Meter Pro, use the From the meter section above (dial or local RF) — the Connect form cannot invent cloud access the company disabled.",
  meters: [
    {
      meterCount: 1,
      meterSerial: "5136830",
      address: "12 Herzl St, Tel Aviv",
      lastRead: 1842.3,
      readDate: new Date().toISOString(),
      dailyConsumption: 0.4,
      monthlyConsumption: 8.7,
      forecast: 11.2,
    },
    {
      meterCount: 2,
      meterSerial: "5182401",
      address: "Garden / irrigation",
      lastRead: 326.1,
      readDate: new Date().toISOString(),
      dailyConsumption: 0.1,
      monthlyConsumption: 2.3,
      forecast: 3.0,
    },
  ],
};

export const accessSteps = [
  {
    id: "utility",
    title: "Still worth asking the תאגיד",
    hebrew: "פנייה לתאגיד המים",
    summary:
      "Sometimes consumer access can be turned on later. It is optional on their side — if they refuse, stay on the meter-local path.",
    steps: [
      "Ask whether Read Your Meter Pro / CityMind consumer access can be enabled for your account.",
      "If they use a different MDM, ask which consumer app or export they offer instead.",
      "Keep using dial reads or Dialog3G RF while you wait.",
    ],
    support: "Billing stays with the utility. Arad app/tech support: 1-700-50-6565 · supportarad@arad.co.il",
    links: [
      { label: "rym-pro.com", href: "https://rym-pro.com/" },
      { label: "Arad consumer info", href: "https://info.arad.co.il/" },
    ],
  },
  {
    id: "cloud",
    title: "Read Your Meter Pro (only if enabled)",
    hebrew: "קריאת מד המים – רק אם התאגיד אישר",
    summary:
      "This is the website/app path. It only works when the water company has turned it on for Arad customers. If signup fails, it is not a password problem — access was not provisioned.",
    steps: [
      "Register with the phone on the account, or מספר משלם + מספר נכס from the bill.",
      "If login works, use Connect below or Home Assistant’s rympro integration.",
      "If it fails, stop fighting the portal and use From the meter instead.",
    ],
    support: "Cloud login cannot bypass a utility that never enabled consumer access.",
    links: [
      { label: "rym-pro.com", href: "https://rym-pro.com/" },
    ],
  },
];

export const weeklyMock = [
  { day: "Sun", liters: 380 },
  { day: "Mon", liters: 420 },
  { day: "Tue", liters: 310 },
  { day: "Wed", liters: 450 },
  { day: "Thu", liters: 390 },
  { day: "Fri", liters: 510 },
  { day: "Sat", liters: 280 },
];
