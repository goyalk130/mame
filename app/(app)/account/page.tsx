import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountSettings } from "@/components/account/account-settings";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "karranngoyal@gmail.com";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  return (
    <AccountSettings
      userId={user.id}
      fullName={profile?.full_name || ""}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
