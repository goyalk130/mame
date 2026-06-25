import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "karranngoyal@gmail.com";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Super admin always passes through
  if (user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return <>{children}</>;
  }

  // Check profile approval status — fail open on DB errors (e.g. migration not yet applied)
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  // If the column doesn't exist yet or any other DB error, let the user through
  if (error) return <>{children}</>;

  if (profile?.status === "rejected") redirect("/pending-approval?rejected=1");
  if (profile?.status === "pending") redirect("/pending-approval");

  return <>{children}</>;
}
