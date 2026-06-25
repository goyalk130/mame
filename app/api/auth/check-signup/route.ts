import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_config")
    .select("value")
    .eq("key", "signup_enabled")
    .single();

  const allowed = data?.value === "true";
  return NextResponse.json({ allowed });
}
