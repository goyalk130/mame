"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, MapPin, Ticket } from "lucide-react";
import { format } from "date-fns";

interface EventRow {
  id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  venue: string | null;
  created_at: string;
  ticket_count?: number;
}

export default function EventsPage() {
  const params = useParams();
  const router = useRouter();
  const projectKey = params.key as string;
  const supabase = createClient();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: project } = await supabase
        .from("projects").select("id").eq("key", projectKey).single();
      if (!project) return;

      const { data } = await supabase
        .from("events")
        .select("id, name, description, event_date, venue, created_at")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });

      if (!data) { setLoading(false); return; }

      // Fetch ticket counts for each event
      const counts = await Promise.all(
        (data as EventRow[]).map(async (e) => {
          const { count } = await supabase
            .from("tickets").select("id", { count: "exact", head: true }).eq("event_id", e.id);
          return { id: e.id, count: count ?? 0 };
        })
      );
      const countMap = Object.fromEntries(counts.map((c) => [c.id, c.count]));
      setEvents((data as EventRow[]).map((e) => ({ ...e, ticket_count: countMap[e.id] })));
      setLoading(false);
    })();
  }, [projectKey]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">{events.length} event{events.length !== 1 ? "s" : ""} in this project</p>
        </div>
        <Button onClick={() => router.push(`/projects/${projectKey}/events/new`)} className="gap-2">
          <Plus size={16} /> New Event
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
          <Calendar size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No events yet</p>
          <p className="text-gray-400 text-sm mt-1">Create an event to start issuing tickets</p>
          <Button className="mt-4 gap-2" onClick={() => router.push(`/projects/${projectKey}/events/new`)}>
            <Plus size={16} /> Create First Event
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              onClick={() => router.push(`/projects/${projectKey}/events/${event.id}`)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{event.name}</p>
                  {event.description && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{event.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {event.venue && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={11} /> {event.venue}
                      </span>
                    )}
                    {event.event_date && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar size={11} /> {format(new Date(event.event_date), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  <Ticket size={12} />
                  {event.ticket_count} ticket{event.ticket_count !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
