import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "goyalkaran130@gmail.com";

// Routes that are fully public (no auth check, no signup gate)
const PUBLIC_PATHS = ["/login", "/ticket", "/api/ticket", "/api/auth/check-signup"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"));
}

function addSecurityHeaders(res: NextResponse) {
  // HSTS — tell browsers to always use HTTPS
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  // No framing (clickjacking protection)
  res.headers.set("X-Frame-Options", "DENY");
  // Prevent MIME sniffing
  res.headers.set("X-Content-Type-Options", "nosniff");
  // Referrer policy — don't leak URL to third-party requests
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions policy — disable sensors/geolocation/camera etc.
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()"
  );
  // Content-Security-Policy
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // Next.js requires unsafe-eval in dev
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

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always add security headers
  const res = NextResponse.next();
  addSecurityHeaders(res);

  // Skip auth/signup checks for public paths and static assets
  if (
    isPublicPath(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/)
  ) {
    return res;
  }

  // For the register page: gate by signup_enabled flag
  // (We check via a lightweight Supabase query; no round-trip for logged-in users)
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
        // Signups disabled — check if the super admin is trying to access
        // (super admin can always create accounts)
        const anonClient = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll: () => req.cookies.getAll(),
              setAll: () => {},
            },
          }
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
      // If DB check fails, allow through (fail open on infra errors, not on user auth)
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
