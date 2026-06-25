"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export default function NewEventPage() {
  const params = useParams();
  const router = useRouter();
  const projectKey = params.key as string;
  const supabase = createClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Event name is required"); return; }
    setLoading(true);

    const { data: project } = await supabase
      .from("projects").select("id").eq("key", projectKey).single();
    if (!project) { toast.error("Project not found"); setLoading(false); return; }

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: project.id, name, description, event_date: eventDate || null, venue }),
    });

    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Failed to create event"); setLoading(false); return; }

    toast.success("Event created!");
    router.push(`/projects/${projectKey}/events/${data.event.id}`);
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/projects/${projectKey}/events`)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">New Event</h1>
          <p className="text-sm text-gray-500">You can add tickets after creating the event</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Name <span className="text-red-500">*</span>
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Annual Conference 2025" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the event…"
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue / Location</label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Mumbai, Maharashtra" />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create Event"}
        </Button>
      </form>
    </div>
  );
}
