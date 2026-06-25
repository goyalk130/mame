"use client";
import { Download, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  qrDataUrl: string;
  name: string;       // ticket holder name
  location: string;   // venue
  eventName?: string; // event name (shown above holder name)
}

export function QrDownloadCard({ qrDataUrl, name, location, eventName }: Props) {
  function downloadQR() {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = eventName ? 600 : 560;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top accent bar
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(0, 0, canvas.width, 8);

    let y = 40;

    // Event name (small label)
    if (eventName) {
      ctx.fillStyle = "#2563eb";
      ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(eventName.toUpperCase(), 240, y);
      y += 26;
    }

    // Holder name
    ctx.fillStyle = "#111827";
    ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(name, 240, y);
    y += 36;

    // Location
    if (location) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "15px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillText(`📍 ${location}`, 240, y);
      y += 28;
    }

    // QR image
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 90, y + 10, 300, 300);

      // Divider
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, y + 325);
      ctx.lineTo(440, y + 325);
      ctx.stroke();

      // Footer
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillText("Scan to verify authenticity  •  Powered by Kirigami Arts", 240, y + 340);

      const link = document.createElement("a");
      link.download = `ticket-${name.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = qrDataUrl;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
      <div className="bg-blue-600 h-2 rounded-t-lg -mx-6 -mt-6 mb-5" />
      {eventName && (
        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">{eventName}</p>
      )}
      <p className="text-xl font-bold text-gray-900 mb-1">{name}</p>
      {location && (
        <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mb-4">
          <MapPin size={13} /> {location}
        </p>
      )}
      <div className="flex justify-center mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Ticket QR Code" className="w-56 h-56 rounded-lg border border-gray-100" />
      </div>
      <p className="text-xs text-gray-400 mb-4">Scan to verify authenticity · Powered by Kirigami Arts</p>
      <Button onClick={downloadQR} className="w-full gap-2">
        <Download size={15} /> Download QR Image
      </Button>
    </div>
  );
}
