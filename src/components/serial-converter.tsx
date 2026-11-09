"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decimalSerialToHex } from "@/lib/meter-guide";

export function SerialConverter() {
  const [serial, setSerial] = useState("5136830");
  const result = useMemo(() => decimalSerialToHex(serial), [serial]);

  return (
    <div className="rounded-2xl border border-border/70 bg-white/80 p-5 backdrop-blur">
      <Label htmlFor="serial" className="text-[hsl(var(--water-deep))]">
        Meter serial → hex ID
      </Label>
      <p className="mt-1 text-sm text-muted-foreground">
        Copy the number printed on the Arad face. Decoders use the hex form to
        keep only your packets.
      </p>
      <Input
        id="serial"
        inputMode="numeric"
        className="mt-3"
        value={serial}
        onChange={(e) => setSerial(e.target.value)}
        placeholder="e.g. 5136830"
      />
      {result.error ? (
        <p className="mt-3 text-sm text-destructive">{result.error}</p>
      ) : (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Decimal</dt>
            <dd className="font-mono text-lg">{result.cleaned}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Hex for decoders</dt>
            <dd className="font-mono text-lg text-[hsl(var(--water-mid))]">
              {result.hexPrefixed}
            </dd>
          </div>
        </dl>
      )}
      {!result.error && (
        <p className="mt-3 text-xs text-muted-foreground">
          Example ESPHome field:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">
            meter_id: &quot;{result.hexPrefixed}&quot;
          </code>
        </p>
      )}
    </div>
  );
}
