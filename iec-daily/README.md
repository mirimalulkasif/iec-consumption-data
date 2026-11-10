# IEC Daily

Standalone tool for **Israel Electric Corporation** smart-meter customers.

Upload the official `meter_LP` CSV (15‑minute readings) and get **daily kWh** totals. Parsing happens in the browser.

This project is separate from the Arad water-meter app.

## Run

```bash
cd iec-daily
npm install
npm run dev -- --port 3851
```

Open [http://127.0.0.1:3851](http://127.0.0.1:3851).

## Get the file from חברת החשמל

1. Sign in to the IEC personal area with ID + SMS code  
2. Open consumption data → current status  
3. Request the file by email  
4. Save `meter_LP…` as-is (don’t re-save from Excel)  
5. Upload it in the app  

## Stack

Next.js, TypeScript, Tailwind CSS
