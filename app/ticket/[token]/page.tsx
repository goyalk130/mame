import { Metadata } from "next";
import { CheckCircle2, XCircle, MapPin, Calendar, DollarSign, Ticket } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

interface Props { params: Promise<{ token: string }> }

export const metadata: Metadata = { title: "Ticket Verification · Mame" };

async function verifyTicket(token: string) {
  try {
    const admin = createAdminClient();

    const { data: ticket } = await admin
      .from("tickets")
      .select("id, name, amount, created_at, event_id")
      .eq("token", token)
      .single();

    if (!ticket) return { valid: false, error: "Ticket not found" };

    const { data: event } = await admin
      .from("events")
      .select("name, venue, event_date, project_id")
      .eq("id", ticket.event_id)
      .single();

    const { data: project } = await admin
      .from("projects")
      .select("name")
      .eq("id", event?.project_id)
      .single();

    return {
      valid: true,
      ticket: { holder_name: ticket.name, amount: ticket.amount, created_at: ticket.created_at },
      event: { name: event?.name, venue: event?.venue, event_date: event?.event_date, project_name: project?.name },
    };
  } catch {
    return { valid: false, error: "Verification failed" };
  }
}

export default async function TicketVerifyPage({ params }: Props) {
  const { token } = await params;
  const validFormat = /^[0-9a-f]{64}$/.test(token);
  const result = validFormat ? await verifyTicket(token) : { valid: false, error: "Invalid ticket format" };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="font-semibold text-gray-700 text-lg">Mame</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className={`px-6 py-5 flex items-center gap-3 ${result.valid ? "bg-green-50 border-b border-green-100" : "bg-red-50 border-b border-red-100"}`}>
            {result.valid ? (
              <>
                <CheckCircle2 className="text-green-600 shrink-0" size={28} />
                <div>
                  <p className="font-semibold text-green-800 text-base">Ticket Verified ✓</p>
                  <p className="text-green-700 text-sm">Ticket verified successfully</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="text-red-500 shrink-0" size={28} />
                <div>
                  <p className="font-semibold text-red-800 text-base">Invalid Ticket</p>
                  <p className="text-red-600 text-sm">{(result as any).error || "This ticket could not be verified"}</p>
                </div>
              </>
            )}
          </div>

          {result.valid && (
            <div className="px-6 py-5 space-y-4">
              {result.event?.name && (
                <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                    {result.event.project_name}
                  </p>
                  <p className="font-bold text-blue-900 text-base">{result.event.name}</p>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {result.event.venue && (
                      <span className="flex items-center gap-1 text-xs text-blue-700">
                        <MapPin size={11} /> {result.event.venue}
                      </span>
                    )}
                    {result.event.event_date && (
                      <span className="flex items-center gap-1 text-xs text-blue-700">
                        <Calendar size={11} /> {format(new Date(result.event.event_date), "MMMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Ticket size={11} /> Ticket Holder
                </p>
                <p className="text-2xl font-bold text-gray-900">{result.ticket?.holder_name}</p>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  {result.ticket?.amount != null && (
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <DollarSign size={13} className="text-gray-400" />
                      Amount Paid: <span className="font-semibold text-gray-900">₹{Number(result.ticket.amount).toFixed(2)}</span>
                    </span>
                  )}
                  {result.ticket?.created_at && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      Issued {format(new Date(result.ticket.created_at), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>

            </div>
          )}

          {!result.valid && (
            <div className="px-6 py-5 text-sm text-gray-500">
              Contact the organiser to verify the original QR code.
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by <a href="https://www.instagram.com/kirigamiarts/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Kirigami Arts</a>
        </p>
      </div>
    </div>
  );
}
