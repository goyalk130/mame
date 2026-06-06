import fs from "fs";
import path from "path";

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!
  .replace("https://", "")
  .replace(".supabase.co", "");

export async function runSchema() {
  const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

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
      console.log("✓ Database schema applied");
    } else {
      const err = await res.text();
      console.warn("⚠ Schema warning:", err);
    }
  } catch (err: any) {
    console.warn("⚠ Could not apply schema:", err.message);
  }
}
