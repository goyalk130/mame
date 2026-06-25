import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "goyalkaran130@gmail.com";

async function verifySuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) return null;
  return user;
}

// GET /api/admin/requests — list all non-approved profiles
export async function GET() {
  const user = await verifySuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, full_name, avatar_url, status, created_at")
    .neq("email", SUPER_ADMIN_EMAIL)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// PATCH /api/admin/requests — approve or reject a profile
export async function PATCH(req: NextRequest) {
  const user = await verifySuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { profileId, action } = await req.json();
  if (!profileId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const status = action === "approve" ? "approved" : "rejected";
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ status })
    .eq("id", profileId);

  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
