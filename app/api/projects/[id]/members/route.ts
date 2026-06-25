import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Service role client bypasses RLS entirely
function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const service = serviceClient();

  // Verify caller is project owner
  const { data: project } = await service.from("projects").select("owner_id").eq("id", projectId).single();
  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Only the project owner can add members" }, { status: 403 });
  }

  // Find target user by email
  const { data: profile } = await service.from("profiles").select("*").eq("email", email.trim()).single();
  if (!profile) {
    return NextResponse.json({ error: "No account found with that email. They must sign up first." }, { status: 404 });
  }

  if (profile.id === user.id) {
    return NextResponse.json({ error: "You are already the project owner" }, { status: 400 });
  }

  // Check already a member
  const { data: existing } = await service.from("project_members").select("id").eq("project_id", projectId).eq("user_id", profile.id).single();
  if (existing) {
    return NextResponse.json({ error: "User is already a member" }, { status: 400 });
  }

  // Insert using service role — bypasses RLS
  const { data: member, error } = await service
    .from("project_members")
    .insert({ project_id: projectId, user_id: profile.id, role: "member" })
    .select("*, profile:profiles(*)")
    .single();

  if (error) return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  return NextResponse.json(member);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await req.json();
  const service = serviceClient();

  // Verify caller is project owner
  const { data: project } = await service.from("projects").select("owner_id").eq("id", projectId).single();
  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Only the project owner can remove members" }, { status: 403 });
  }

  const { error } = await service.from("project_members").delete().eq("id", memberId).eq("project_id", projectId);
  if (error) return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  return NextResponse.json({ success: true });
}
