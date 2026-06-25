import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST — create a new event under a project
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { project_id, name, description, event_date, venue } = await req.json();
  if (!project_id || !name?.trim()) {
    return NextResponse.json({ error: "project_id and name are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: event, error } = await admin
    .from("events")
    .insert({
      project_id,
      name: name.trim(),
      description: description?.trim() || null,
      event_date: event_date || null,
      venue: venue?.trim() || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event }, { status: 201 });
}
