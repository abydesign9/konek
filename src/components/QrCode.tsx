"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Renders a real, scannable QR from arbitrary text (e.g. an eSIM LPA
// activation string). Client-side so it works in both server and client pages.
export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: "#22315C", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => setDataUrl(null));
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <div
      className="rounded-xl border border-indigo/10 bg-white p-3 inline-flex items-center justify-center"
      style={{ width: size + 24, height: size + 24 }}
    >
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="eSIM activation QR code" width={size} height={size} />
      ) : (
        <span className="text-xs text-indigo/40">Generating…</span>
      )}
    </div>
  );
}
