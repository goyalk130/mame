import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS.
// NEVER import this in client components or pages rendered in the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
