import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existing) {
      await supabase.from("profiles").insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name ?? user.email!.split("@")[0],
        avatar_url: user.user_metadata?.avatar_url ?? null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
