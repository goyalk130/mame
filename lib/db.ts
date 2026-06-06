import { Pool } from "pg";
import fs from "fs";
import path from "path";

const pool = new Pool({
  host: `db.${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace("https://", "").replace(".supabase.co", "")}.supabase.co`,
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

export async function runSchema() {
  const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("✓ Database schema applied");
  } catch (err) {
    console.error("Schema error:", err);
  } finally {
    client.release();
  }
}
