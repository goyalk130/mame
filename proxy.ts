import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "goyalkaran130@gmail.com";

// ── Rate limiter (in-memory sliding window) ──────────────────────────────────
// Works for single-instance deployments (Vercel Hobby/Pro with one region).
// For multi-region, swap this for Upstash Redis.
interface RateEntry { count: number; resetAt: number }
const rateLimitStore = new Map<string, RateEntry>();

// Clean up expired entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt < now) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Returns true if the request should be blocked
function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  if (entry.count > limit) return true;
  return false;
}

function rateLimitResponse(retryAfterSeconds: number): NextResponse {
  const res = NextResponse.json(
    { error: "Too many requests. Please slow down." },
    { status: 429 }
  );
  res.headers.set("Retry-After", String(retryAfterSeconds));
  addSecurityHeaders(res);
  return res;
}

// ── Route helpers ─────────────────────────────────────────────────────────────
const PUBLIC_PATHS = ["/login", "/ticket", "/api/ticket", "/api/auth/check-signup"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );
}

// ── Security headers ──────────────────────────────────────────────────────────
function addSecurityHeaders(res: NextResponse) {
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()"
  );
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  return res;
}

// ── Main proxy handler ────────────────────────────────────────────────────────
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getIp(req);

  // Skip static assets entirely — no processing needed
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  // ── Rate limits ─────────────────────────────────────────────────────────────

  // Public ticket verify — 60 req/min per IP
  // (generous for legitimate scanners, still blocks automated attacks)
  if (pathname.startsWith("/ticket/") || pathname.startsWith("/api/ticket/")) {
    if (isRateLimited(`ticket:${ip}`, 60, 60_000)) {
      return rateLimitResponse(60);
    }
  }

  // Login page / auth API — 10 attempts per 10 minutes per IP
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/auth/")
  ) {
    if (isRateLimited(`auth:${ip}`, 10, 10 * 60_000)) {
      return rateLimitResponse(600);
    }
  }

  // Register page — 5 attempts per 15 minutes per IP
  if (pathname === "/register" || pathname.startsWith("/register/")) {
    if (isRateLimited(`register:${ip}`, 5, 15 * 60_000)) {
      return rateLimitResponse(900);
    }
  }

  // All authenticated API routes — 200 req/min per IP
  if (pathname.startsWith("/api/") && !isPublicPath(pathname)) {
    if (isRateLimited(`api:${ip}`, 200, 60_000)) {
      return rateLimitResponse(60);
    }
  }

  // ── Security headers (added to every response) ──────────────────────────────
  const res = NextResponse.next();
  addSecurityHeaders(res);

  // ── Signup gate (register page only) ────────────────────────────────────────
  if (pathname === "/register" || pathname.startsWith("/register/")) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll: () => [], setAll: () => {} } }
      );
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "signup_enabled")
        .single();

      if (data?.value !== "true") {
        const anonClient = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
        );
        const { data: { user } } = await anonClient.auth.getUser();
        if (user?.email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
          const url = req.nextUrl.clone();
          url.pathname = "/login";
          url.searchParams.set("info", "signups-closed");
          return NextResponse.redirect(url);
        }
      }
    } catch {
      // Fail open on infra errors — don't lock out users due to DB issues
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
