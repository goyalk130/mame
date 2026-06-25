import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("tickets")
    .select("token, event_id")
    .eq("id", id)
    .single();

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (req.headers.get("origin") ?? "http://localhost:3000");

  const qrDataUrl = await QRCode.toDataURL(`${baseUrl}/ticket/${ticket.token}`, {
    width: 300,
    margin: 2,
    color: { dark: "#111827", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });

  return NextResponse.json({ qrDataUrl });
}
