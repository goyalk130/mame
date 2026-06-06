export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runSchema } = await import("./lib/db");
    await runSchema();
  }
}
