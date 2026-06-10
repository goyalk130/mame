import fs from "fs";
import path from "path";
import crypto from "crypto";

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!
  .replace("https://", "")
  .replace(".supabase.co", "");

// In-process cache: once the schema has been applied this process, skip future calls.
// On serverless, each cold start is a new process so we always check once per cold start.
let appliedHash: string | null = null;

export async function runSchema() {
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.warn("⚠ SUPABASE_ACCESS_TOKEN not set — skipping schema auto-apply");
    return;
  }

  const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  const hash = crypto.createHash("sha256").update(sql).digest("hex").slice(0, 12);

  // Already applied this exact schema in this process — skip.
  if (appliedHash === hash) return;

  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (res.ok) {
      appliedHash = hash; // remember we applied it — skip on next call this process
      console.log(`✓ Database schema applied (${hash})`);
    } else {
      const err = await res.text();
      console.warn("⚠ Schema warning:", err);
    }
  } catch (err: any) {
    console.warn("⚠ Could not apply schema:", err.message);
  }
}
