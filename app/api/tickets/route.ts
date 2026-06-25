import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST — create a ticket inside an event, generate QR
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { event_id, name, phone, email, notes, amount } = await req.json();
  if (!event_id || !name?.trim()) {
    return NextResponse.json({ error: "event_id and name are required" }, { status: 400 });
  }

  // 256-bit cryptographically random token — never returned to client
  const token = crypto.randomBytes(32).toString("hex");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (req.headers.get("origin") ?? "http://localhost:3000");
  const ticketUrl = `${baseUrl}/ticket/${token}`;

  const qrDataUrl = await QRCode.toDataURL(ticketUrl, {
    width: 300,
    margin: 2,
    color: { dark: "#111827", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });

  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("tickets")
    .insert({
      event_id,
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      notes: notes?.trim() || null,
      amount: amount ? parseFloat(amount) : null,
      token,
      created_by: user.id,
    })
    .select("id, name, email, phone, notes, amount, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return ticket data + QR — token is NOT included
  return NextResponse.json({ ticket, qrDataUrl }, { status: 201 });
}
