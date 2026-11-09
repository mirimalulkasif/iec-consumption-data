import type { MeterPayload } from "@/lib/rympro";

export const mockMeterPayload: MeterPayload = {
  source: "mock",
  accountNumber: "demo-48291",
  accountName: "Sample household",
  fetchedAt: new Date().toISOString(),
  message:
    "Sample data so you can explore the dashboard. Connect with Read Your Meter Pro to load your real Arad meter.",
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
    id: "cloud",
    title: "Read Your Meter Pro (recommended)",
    hebrew: "קריאת מד המים – האפליקציה והפורטל של ארד",
    summary:
      "If your water utility uses Arad, you can pull cloud readings without extra hardware.",
    steps: [
      "Find your water bill and note the payer / customer number and property number (מספר משלם / מספר נכס), or use the phone number linked to the account.",
      "Register at rym-pro.com or install Read Your Meter Pro from the App Store / Google Play.",
      "If registration fails, ask your water corporation whether they enable Arad consumer access for your address.",
      "Once login works, use Connect below (or Home Assistant / Hubitat integrations) to pull last read, daily, monthly, and forecast data.",
    ],
    support: "Arad support: 1-700-50-6565 · supportarad@arad.co.il",
    links: [
      { label: "rym-pro.com", href: "https://rym-pro.com/" },
      { label: "Arad consumer info", href: "https://info.arad.co.il/" },
    ],
  },
  {
    id: "rf",
    title: "Local RF (Dialog3G)",
    hebrew: "קריאה מקומית בגלים – Dialog3G",
    summary:
      "Many Israeli Arad meters broadcast every ~30s on 916.3 MHz. You can decode your own meter ID locally.",
    steps: [
      "Read the decimal serial printed on the meter face and convert it to hex (example: 5136830 → 0x4E61BE).",
      "Use an RTL-SDR with rtl_433’s Arad/Master Meter Dialog3G decoder, or an ESP32 + SI4432/XL4432 receiver.",
      "Tune to 916.3 MHz FSK / Manchester; validated open-source decoders publish the reading in m³.",
      "This path needs no utility portal, but it does need radio hardware near the meter and only sees packets in range.",
    ],
    support: "Useful projects: rtl_433 Dialog3G decoder · Dialog3g-Decoder (ESPHome)",
    links: [
      {
        label: "Dialog3g-Decoder",
        href: "https://github.com/assafms/Dialog3g-Decoder",
      },
      {
        label: "rtl_433 Arad PR",
        href: "https://github.com/merbanan/rtl_433/pull/2984",
      },
    ],
  },
  {
    id: "utility",
    title: "Ask the water corporation",
    hebrew: "פנייה לתאגיד המים",
    summary:
      "Billing and portal enablement are controlled by your תאגיד מים, not only by the physical meter brand.",
    steps: [
      "Confirm the meter is Arad (logo / model on the face).",
      "Ask whether consumer Read Your Meter Pro / CityMind access is enabled for your account.",
      "If the utility uses a different MDM, request their consumer app or export instead.",
    ],
    support: "Billing questions stay with the utility; Arad handles meter/app technical support.",
    links: [],
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
