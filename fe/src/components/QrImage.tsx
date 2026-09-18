import { useEffect, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";

export function QrImage({
  value,
  size = 96,
  onData,
  logoUrl = "/logo.png",
}: {
  value: string;
  size?: number;
  onData?: (dataUrl: string) => void;
  logoUrl?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    setReady(false);

    const scale = 3;
    const px = size * scale;

    const qr = new QRCodeStyling({
      width: px,
      height: px,
      type: "canvas",
      data: value,
      margin: 8,
      qrOptions: { errorCorrectionLevel: "H" },
      backgroundOptions: { color: "#ffffff" },
      dotsOptions: {
        type: "rounded",
        gradient: {
          type: "linear",
          rotation: Math.PI / 4,
          colorStops: [
            { offset: 0, color: "#6366f1" },
            { offset: 1, color: "#a855f7" },
          ],
        },
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        gradient: {
          type: "linear",
          rotation: Math.PI / 4,
          colorStops: [
            { offset: 0, color: "#4f46e5" },
            { offset: 1, color: "#9333ea" },
          ],
        },
      },
      cornersDotOptions: { type: "dot", color: "#4f46e5" },
    });

    const container = ref.current;
    container.innerHTML = "";
    qr.append(container);

    async function drawLogoAndExport() {
      const canvas = container.querySelector("canvas");
      if (!canvas) return;

      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.borderRadius = "16px";

      const ctx = canvas.getContext("2d");

      // Gambar logo dulu (kalau ada), TUNGGU sampai selesai,
      // baru ambil data PNG — supaya hasil download ikut logo.
      if (ctx && logoUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous"; // penting kalau logo di-hosting beda origin
          img.onload = () => {
            const logoRelativeSize = 0.26;
            const logoSize = canvas.width * logoRelativeSize;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const ringR = logoSize / 2 + 6;

            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(
              img,
              cx - logoSize / 2,
              cy - logoSize / 2,
              logoSize,
              logoSize,
            );
            ctx.restore();
            resolve();
          };
          img.onerror = () => {
            console.warn("Failed to load logo image");
            resolve(); // tetap lanjut export tanpa logo
          };
          img.src = logoUrl;
        });
      }

      if (cancelled) return;
      setReady(true);

      // Export SETELAH logo digambar
      const blob = await qr.getRawData("png");
      if (!blob || cancelled) return;
      const reader = new FileReader();
      reader.onload = () => onData?.(reader.result as string);
      reader.readAsDataURL(blob as Blob);
    }

    drawLogoAndExport();

    return () => {
      cancelled = true;
    };
  }, [value, size, onData, logoUrl]);

  return (
    <div
      ref={ref}
      style={{
        width: size,
        height: size,
        opacity: ready ? 1 : 0,
        transform: ready ? "scale(1)" : "scale(0.96)",
        transition: "opacity 300ms ease, transform 300ms ease",
      }}
    />
  );
}
