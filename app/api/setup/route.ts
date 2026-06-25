import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "karranngoyal@gmail.com";

// Called after login to ensure the profile row exists for the current user.
// The DB trigger handles new signups, but existing users (created before schema ran)
// need this fallback.
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const { data: existing } = await supabase
      .from("profiles")
      .select("id, status")
      .eq("id", user.id)
      .single();

    const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    if (!existing) {
      const admin = createAdminClient();
      await admin.from("profiles").insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name ?? user.email!.split("@")[0],
        avatar_url: user.user_metadata?.avatar_url ?? null,
        status: isSuperAdmin ? "approved" : "pending",
      });
    } else if (isSuperAdmin && (existing as any).status !== "approved") {
      // Ensure super admin is always approved
      const admin = createAdminClient();
      await admin.from("profiles").update({ status: "approved" }).eq("id", user.id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
