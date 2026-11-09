export type HardwareOption = {
  id: string;
  title: string;
  cost: string;
  bestFor: string;
  parts: string[];
  software: string;
  links: { label: string; href: string }[];
};

export const fromMeterPaths = [
  {
    id: "eyeball",
    title: "Read the dial on the meter",
    hebrew: "קריאה ישירה מהמספרים על המד",
    summary:
      "No radio, no app, no utility approval. Walk up to the meter and note the black (or LCD) digits — that is your cumulative m³.",
    steps: [
      "Open the meter pit / cupboard and find the Arad face.",
      "Write down the whole-number cubic meters shown (and the serial printed on the face).",
      "Subtract yesterday’s number from today’s to get daily use. Resolution in Israel is often 0.1 m³ (100 liters).",
    ],
  },
  {
    id: "rf",
    title: "Catch the radio packets (Dialog3G)",
    hebrew: "קליטת השידור האלחוטי מהמד",
    summary:
      "Most Arad smart meters in Israel broadcast your reading about every 30 seconds on 916.3 MHz. That broadcast does not need the water company’s web portal — only a small radio receiver near the meter, filtered to your serial.",
    steps: [
      "Confirm the meter face shows Arad / Dialog-style AMI branding and note the decimal serial.",
      "Convert that serial to hex (use the converter below) — decoders filter on this ID so you only keep your meter.",
      "Place a receiver within range of the meter (same building / nearby pit; walls reduce range).",
      "Decode FSK + Manchester packets; validated open-source tools publish consumption in m³.",
    ],
  },
];

export const hardwareOptions: HardwareOption[] = [
  {
    id: "rtl",
    title: "RTL-SDR dongle + computer",
    cost: "Often the fastest first try if you already have a PC",
    bestFor: "Laptop / Raspberry Pi next to the meter, one-off checks or continuous logging",
    parts: [
      "RTL-SDR USB stick that tunes 916.3 MHz",
      "Small antenna",
      "Computer or Raspberry Pi with rtl_433",
    ],
    software:
      "rtl_433 with the Arad / Master Meter Dialog3G decoder. Filter on your serial so neighboring meters are ignored.",
    links: [
      {
        label: "rtl_433 Arad Dialog3G",
        href: "https://github.com/merbanan/rtl_433/pull/2984",
      },
    ],
  },
  {
    id: "esp",
    title: "ESP32 + SI4432 / XL4432",
    cost: "Dedicated always-on reader (often under DIY-hobby pricing)",
    bestFor:
      "A tiny Wi‑Fi board that listens for the meter’s radio — it is not wired into the Arad, and it does not use the meter’s power",
    parts: [
      "ESP32 (small Wi‑Fi microcontroller you power yourself)",
      "SI4432 or XL4432 radio module tuned to hear 916.3 MHz",
      "Optional small PCB from Dialog3g-Decoder to wire them cleanly",
      "Your power plan: indoor USB, long cable, battery pack, or small solar — the outdoor meter has none",
    ],
    software:
      "ESPHome custom component from Dialog3g-Decoder — set meter_id to your hex serial and publish the sensor to Home Assistant (or MQTT).",
    links: [
      {
        label: "Dialog3g-Decoder (ESPHome)",
        href: "https://github.com/assafms/Dialog3g-Decoder",
      },
    ],
  },
];

export const outdoorPowerNotes = [
  {
    title: "It does not plug into the Arad",
    body: "The ESP is a separate listener. The meter keeps running on its own sealed battery and only broadcasts radio packets. You never open or power the Arad device.",
  },
  {
    title: "Prefer indoors if the signal reaches",
    body: "First try the receiver inside — balcony, ground-floor window, stairwell, or utility room facing the meter pit. Many people receive Dialog3G from tens of meters away if the path is not blocked by thick concrete or a deep metal lid.",
  },
  {
    title: "If you must sit near the pit",
    body: "Use a weatherproof box + USB power bank (swap/recharge), a long low-voltage cable from the house, or a small solar + battery kit. The ESP needs continuous power for always-on reading; the meter does not supply it.",
  },
  {
    title: "Wi‑Fi is the second constraint",
    body: "An ESP32 usually sends readings over your home Wi‑Fi. If the pit is far from coverage, either move the receiver closer to the house (if RF still works) or use a board with better outdoor link options — but start by testing range with a temporary USB power bank.",
  },
];

export const rfFacts = [
  { label: "Frequency (Israel)", value: "916.3 MHz" },
  { label: "Modulation", value: "FSK + Manchester" },
  { label: "How often", value: "~every 30 seconds" },
  { label: "What is in the packet", value: "Meter ID + consumption" },
  { label: "Utility portal needed?", value: "No" },
  { label: "Typical resolution", value: "0.1 m³ (100 L) in Israel" },
];

export function decimalSerialToHex(raw: string): {
  cleaned: string;
  hex: string;
  hexPrefixed: string;
  error?: string;
} {
  const cleaned = raw.replace(/[\s,_-]/g, "");
  if (!cleaned) {
    return { cleaned: "", hex: "", hexPrefixed: "", error: "Enter the serial from the meter face." };
  }
  if (!/^\d+$/.test(cleaned)) {
    return {
      cleaned,
      hex: "",
      hexPrefixed: "",
      error: "Serial should be digits only (ignore letters printed beside it for now).",
    };
  }
  if (cleaned.length > 15) {
    return {
      cleaned,
      hex: "",
      hexPrefixed: "",
      error: "That serial looks too long — check the digits on the meter face.",
    };
  }
  const value = Number(cleaned);
  if (!Number.isSafeInteger(value) || value < 0) {
    return { cleaned, hex: "", hexPrefixed: "", error: "Could not convert that serial." };
  }
  const hex = value.toString(16).toUpperCase();
  return { cleaned, hex, hexPrefixed: `0x${hex}` };
}
