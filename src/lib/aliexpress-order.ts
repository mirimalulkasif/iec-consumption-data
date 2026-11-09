export type OrderItem = {
  id: string;
  name: string;
  why: string;
  qty: string;
  must: string;
  searchUrl: string;
  exampleUrl?: string;
  avoid?: string;
};

export const aliexpressOrder: OrderItem[] = [
  {
    id: "esp32",
    name: "ESP32 DevKitC (38‑pin, USB‑C)",
    why: "The Wi‑Fi brain that runs ESPHome and talks to your home network.",
    qty: "1 (order 2 if you want a spare)",
    must: "Classic ESP32 / ESP32-WROOM DevKitC with exposed GPIO12–15 and GPIO5. USB‑C is fine.",
    searchUrl:
      "https://www.aliexpress.com/w/wholesale-ESP32-DevKitC-38PIN-Type-C.html?shipToCountry=IL",
    exampleUrl: "https://www.aliexpress.com/i/3256809753102180.html",
    avoid: "Do not buy ESP32‑C3 / S2 / S3 mini boards unless you are ready to remap pins — stick to the common 38‑pin DevKitC for the Dialog3g wiring table.",
  },
  {
    id: "si4432",
    name: "Mini SI4432 module 240–930 MHz + spring antenna",
    why: "The radio that hears the Arad Dialog3G packets at 916.3 MHz in Israel.",
    qty: "1–2",
    must: 'Title/specs must say "240MHz-930MHz" (or similar wideband). The chip is SI4432 / XL4432.',
    searchUrl:
      "https://www.aliexpress.com/w/wholesale-SI4432-240MHZ-930MHZ.html?shipToCountry=IL",
    exampleUrl: "https://www.aliexpress.com/i/3256808542346140.html",
    avoid:
      "Do NOT buy modules labeled only 433MHz / 470MHz. Those will not tune Israel’s 916.3 MHz meters even though the chip name looks the same.",
  },
  {
    id: "dupont",
    name: "Dupont jumper wires (female–female + male–female)",
    why: "Temporary SPI wiring between ESP32 and SI4432 without soldering.",
    qty: "1 pack (40 pcs is enough)",
    must: "Include female–female for module headers.",
    searchUrl:
      "https://www.aliexpress.com/w/wholesale-Dupont-jumper-wire-female.html?shipToCountry=IL",
  },
  {
    id: "breadboard",
    name: "Half-size breadboard (optional)",
    why: "Holds the boards steady while you range-test near a window.",
    qty: "1",
    must: "Any small breadboard.",
    searchUrl:
      "https://www.aliexpress.com/w/wholesale-breadboard-400.html?shipToCountry=IL",
  },
  {
    id: "cable",
    name: "USB‑C cable (data + power)",
    why: "Flash the ESP32 from a laptop, then power it from a phone charger or power bank.",
    qty: "1",
    must: "Data-capable cable (not charge-only).",
    searchUrl:
      "https://www.aliexpress.com/w/wholesale-USB-C-cable-data.html?shipToCountry=IL",
  },
  {
    id: "powerbank",
    name: "USB power bank 5V",
    why: "Lets you walk outdoors and test reception without a wall socket at the meter.",
    qty: "1 (or use one you already own)",
    must: "Any 5V USB output bank. 5,000–10,000 mAh is plenty for testing.",
    searchUrl:
      "https://www.aliexpress.com/w/wholesale-power-bank-10000mah.html?shipToCountry=IL",
  },
  {
    id: "box",
    name: "IP65 junction box (only if outdoor mount)",
    why: "Weather shell if the only place you get signal is near the pit.",
    qty: "1 — buy after the indoor range test fails",
    must: "Big enough for ESP32 + radio + cable gland for USB/antenna.",
    searchUrl:
      "https://www.aliexpress.com/w/wholesale-IP65-junction-box.html?shipToCountry=IL",
    avoid: "Skip this on the first order. Prove radio range from the house first.",
  },
];

export const wiringReminder = [
  { esp: "GPIO14 (SCK)", radio: "SCK" },
  { esp: "GPIO13 (MOSI)", radio: "SDI" },
  { esp: "GPIO12 (MISO)", radio: "SDO" },
  { esp: "GPIO15", radio: "nSEL / CS" },
  { esp: "GPIO5", radio: "nIRQ" },
  { esp: "3V3", radio: "VCC (1.8–3.6 V — use 3.3 V, not 5 V)" },
  { esp: "GND", radio: "GND" },
];
