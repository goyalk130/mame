"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, QrCode, Trash2, Mail, Phone, DollarSign, Calendar, MapPin, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { QrModal } from "@/components/events/qr-modal";
import { QrDownloadCard } from "@/components/events/qr-download-card";

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  venue: string | null;
}

interface Ticket {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  amount: number | null;
  created_at: string;
}

type View = "list" | "new-ticket" | "ticket-created" | "edit-event";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectKey = params.key as string;
  const eventId = params.eventId as string;
  const supabase = createClient();

  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [qrTarget, setQrTarget] = useState<{ id: string; name: string } | null>(null);

  // Edit event form state
  const [eName, setEName] = useState("");
  const [eDescription, setEDescription] = useState("");
  const [eDate, setEDate] = useState("");
  const [eVenue, setEVenue] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);

  // New ticket form state
  const [tName, setTName] = useState("");
  const [tPhone, setTPhone] = useState("");
  const [tEmail, setTEmail] = useState("");
  const [tNotes, setTNotes] = useState("");
  const [tAmount, setTAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdQr, setCreatedQr] = useState<{ qrDataUrl: string; name: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: ev } = await supabase
        .from("events").select("id, name, description, event_date, venue").eq("id", eventId).single();
      setEvent(ev as Event || null);

      const { data: tix } = await supabase
        .from("tickets")
        .select("id, name, email, phone, notes, amount, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      setTickets((tix as Ticket[]) || []);
      setLoading(false);
    })();
  }, [eventId]);

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!tName.trim()) { toast.error("Name is required"); return; }
    setSaving(true);

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, name: tName, phone: tPhone, email: tEmail, notes: tNotes, amount: tAmount || undefined }),
    });

    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Failed to create ticket"); setSaving(false); return; }

    setTickets((prev) => [data.ticket as Ticket, ...prev]);
    setCreatedQr({ qrDataUrl: data.qrDataUrl, name: data.ticket.name });
    setView("ticket-created");
    setSaving(false);
    toast.success("Ticket created!");
    // Reset form
    setTName(""); setTPhone(""); setTEmail(""); setTNotes(""); setTAmount("");
  }

  async function deleteTicket(id: string) {
    if (!confirm("Delete this ticket? The QR code will stop working.")) return;
    const { error } = await supabase.from("tickets").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setTickets((prev) => prev.filter((t) => t.id !== id));
    toast.success("Ticket deleted");
  }

  async function deleteEvent() {
    if (!confirm(`Delete "${event?.name}" and ALL its tickets? This cannot be undone.`)) return;
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) { toast.error(error.message); return; }
    toast.success("Event deleted");
    router.push(`/projects/${projectKey}/events`);
  }

  function openEdit() {
    if (!event) return;
    setEName(event.name);
    setEDescription(event.description || "");
    setEDate(event.event_date || "");
    setEVenue(event.venue || "");
    setView("edit-event");
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eName.trim()) { toast.error("Event name is required"); return; }
    setSavingEvent(true);
    const { data, error } = await supabase
      .from("events")
      .update({ name: eName.trim(), description: eDescription.trim() || null, event_date: eDate || null, venue: eVenue.trim() || null })
      .eq("id", eventId)
      .select("id, name, description, event_date, venue")
      .single();
    if (error) { toast.error(error.message); setSavingEvent(false); return; }
    setEvent(data as Event);
    setView("list");
    setSavingEvent(false);
    toast.success("Event updated");
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading…</div>;
  if (!event) return <div className="p-6 text-sm text-red-500">Event not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => router.push(`/projects/${projectKey}/events`)} className="text-gray-400 hover:text-gray-600 mt-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900">{event.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {event.venue && (
              <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={11} /> {event.venue}</span>
            )}
            {event.event_date && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar size={11} /> {format(new Date(event.event_date), "MMM d, yyyy")}
              </span>
            )}
          </div>
          {event.description && <p className="text-sm text-gray-500 mt-1">{event.description}</p>}
        </div>
        {view === "list" && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={openEdit} className="gap-1.5 text-sm">
              <Pencil size={14} /> Edit
            </Button>
            <Button onClick={() => setView("new-ticket")} className="gap-2">
              <Plus size={15} /> Add Ticket
            </Button>
          </div>
        )}
      </div>

      {/* New ticket form */}
      {view === "new-ticket" && (
        <form onSubmit={createTicket} className="bg-white border border-gray-200 rounded-lg p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="font-medium text-gray-800 text-sm">New Ticket</p>
            <button type="button" onClick={() => setView("list")} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name <span className="text-red-500">*</span></label>
            <Input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Jane Doe" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <Input value={tPhone} onChange={(e) => setTPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <Input value={tEmail} onChange={(e) => setTEmail(e.target.value)} placeholder="jane@example.com" type="email" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paid</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <Input value={tAmount} onChange={(e) => setTAmount(e.target.value)} placeholder="0.00" type="number" min="0" step="0.01" className="pl-7" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={tNotes} onChange={(e) => setTNotes(e.target.value)} placeholder="Any extra info…" rows={2}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Generating Ticket & QR…" : "Create Ticket"}
          </Button>
        </form>
      )}

      {/* Edit event form */}
      {view === "edit-event" && (
        <form onSubmit={saveEvent} className="bg-white border border-blue-200 rounded-lg p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="font-medium text-gray-800 text-sm">Edit Event</p>
            <button type="button" onClick={() => setView("list")} className="text-gray-400 hover:text-gray-600 p-0.5">
              <X size={16} />
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Event Name <span className="text-red-500">*</span></label>
            <Input value={eName} onChange={(e) => setEName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={eDescription} onChange={(e) => setEDescription(e.target.value)} rows={2}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <Input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Venue / Location</label>
              <Input value={eVenue} onChange={(e) => setEVenue(e.target.value)} placeholder="Mumbai, Maharashtra" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 gap-1.5" disabled={savingEvent}>
              <Check size={14} /> {savingEvent ? "Saving…" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setView("list")}>Cancel</Button>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <button type="button" onClick={deleteEvent}
              className="w-full text-sm text-red-500 hover:text-red-700 hover:bg-red-50 py-2 rounded-md transition-colors flex items-center justify-center gap-1.5">
              <Trash2 size={14} /> Delete this event and all its tickets
            </button>
          </div>
        </form>
      )}

      {/* Ticket created — show QR */}
      {view === "ticket-created" && createdQr && (
        <div className="mb-6">
          <QrDownloadCard qrDataUrl={createdQr.qrDataUrl} name={createdQr.name} location={event.venue || ""} eventName={event.name} />
          <Button variant="outline" className="w-full mt-3" onClick={() => { setCreatedQr(null); setView("list"); }}>
            Back to Tickets
          </Button>
        </div>
      )}

      {/* Tickets list */}
      {view !== "ticket-created" && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            {tickets.length} Ticket{tickets.length !== 1 ? "s" : ""}
          </p>
          {tickets.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <QrCode size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No tickets yet — add the first one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div key={t.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                    <div className="flex flex-wrap gap-x-3 mt-0.5">
                      {t.email && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail size={10} /> {t.email}</span>}
                      {t.phone && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone size={10} /> {t.phone}</span>}
                      {t.amount != null && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><DollarSign size={10} /> ₹{t.amount}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-7 px-2"
                      onClick={() => setQrTarget({ id: t.id, name: t.name })}>
                      <QrCode size={12} /> QR
                    </Button>
                    <button onClick={() => deleteTicket(t.id)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete ticket">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {qrTarget && (
        <QrModal eventId={qrTarget.id} eventName={qrTarget.name} location={event.venue} onClose={() => setQrTarget(null)} isTicket />
      )}
    </div>
  );
}
