import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ valid: false, error: "Invalid ticket" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("tickets")
    .select("id, name, amount, created_at, event_id")
    .eq("token", token)
    .single();

  if (!ticket) {
    return NextResponse.json({ valid: false, error: "Ticket not found" }, { status: 404 });
  }

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

  return NextResponse.json({
    valid: true,
    ticket: {
      id: ticket.id,
      holder_name: ticket.name,
      amount: ticket.amount,
      created_at: ticket.created_at,
    },
    event: {
      name: event?.name ?? null,
      venue: event?.venue ?? null,
      event_date: event?.event_date ?? null,
      project_name: project?.name ?? null,
    },
  });
}
