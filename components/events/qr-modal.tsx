"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { QrDownloadCard } from "./qr-download-card";

interface Props {
  eventId: string;      // ticket id when isTicket=true, event id otherwise
  eventName: string;
  location: string | null;
  onClose: () => void;
  isTicket?: boolean;   // true = fetch from /api/tickets/[id]/qr
}

export function QrModal({ eventId, eventName, location, onClose, isTicket }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = isTicket ? `/api/tickets/${eventId}/qr` : `/api/events/${eventId}/qr`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.qrDataUrl) setQrDataUrl(d.qrDataUrl);
        else setError("Could not load QR code");
      })
      .catch(() => setError("Network error"));
  }, [eventId, isTicket]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-900">Ticket QR Code</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={16} /></button>
        </div>
        <div className="p-4">
          {!qrDataUrl && !error && (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading QR…</div>
          )}
          {error && <p className="text-sm text-red-500 text-center py-8">{error}</p>}
          {qrDataUrl && (
            <QrDownloadCard qrDataUrl={qrDataUrl} name={eventName} location={location || ""} />
          )}
        </div>
      </div>
    </div>
  );
}
