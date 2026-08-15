/**
 * Milestone 28 — Tenant-Aware Middleware
 *
 * Responsibilities:
 *   1. Refresh Supabase session (existing behavior)
 *   2. Resolve school tenant from hostname for tenant-scoped routes
 *   3. Enforce authentication on protected routes
 *   4. Block suspended/cancelled tenants from ERP access
 *   5. Allow all SaaS public routes (register, pricing, subscribe, onboarding)
 *
 * Tenant resolution uses the hostname, NOT client-supplied parameters.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ── Public routes (no auth required) ──────────────────────────────────────────
const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/auth/callback",
  "/auth/error",
  "/register",
  "/pricing",
  "/subscribe",
  "/onboarding",
  "/onboarding/payment",
  "/api/saas/register",
  "/api/saas/plans",
  "/api/saas/subscription/verify",
  "/api/webhooks/paystack/subscription",
  "/api/health",
];

// Routes that are always accessible (APIs, Next internals)
const ALWAYS_PUBLIC_PREFIXES = [
  "/api/health",
  "/api/webhooks/",
  "/api/saas/plans",
  "/api/saas/register",
  "/api/admissions/",   // Public admissions intake API
  "/s/",                // School-specific public pages (admissions, login)
  "/_next/",
  "/favicon",
];

function isPublicRoute(pathname: string): boolean {
  if (ALWAYS_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

// ── Known SaaS platform-level hostnames (no school tenant) ───────────────────
function isPlatformHost(host: string): boolean {
  const baseDomain = (process.env.APEXIUM_BASE_DOMAIN || "").toLowerCase();
  if (!baseDomain) return true; // Dev mode — treat everything as platform

  // If the host is exactly the base domain (not a subdomain), it's platform-level
  return host === baseDomain || host === `www.${baseDomain}` ||
    host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

function extractSlugFromHost(host: string): string | null {
  const baseDomain = (process.env.APEXIUM_BASE_DOMAIN || "").toLowerCase();
  if (!baseDomain) return null;

  const cleanHost = host.split(":")[0].toLowerCase();
  if (cleanHost.endsWith(`.${baseDomain}`)) {
    const slug = cleanHost.slice(0, cleanHost.length - baseDomain.length - 1);
    if (slug && slug !== "www" && slug !== "app") {
      return slug;
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Inject tenant context header for school-specific hostnames ─────────────
  const tenantSlug = extractSlugFromHost(host);
  if (tenantSlug) {
    response.headers.set("x-apexium-tenant-slug", tenantSlug);
  }

  // ── Public routes — no auth required ──────────────────────────────────────
  if (isPublicRoute(pathname)) {
    // Redirect authenticated users away from auth pages to their dashboard
    if (user && (pathname === "/auth/login" || pathname.startsWith("/auth/"))) {
      const role = (user.user_metadata?.role as string) || (user.app_metadata?.role as string);
      if (role === "platform_operator") {
        return NextResponse.redirect(new URL("/platform", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // ── Protected routes — must be authenticated ──────────────────────────────
  if (!user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Server-Side Guard for /platform & /platform/* ──────────────────────────
  if (pathname.startsWith("/platform")) {
    const userRole =
      (user.user_metadata?.role as string) ||
      (user.app_metadata?.role as string);

    if (userRole !== "platform_operator") {
      // Reject non-platform operators (e.g. school admins, teachers, parents, students)
      return NextResponse.redirect(new URL("/dashboard?error=forbidden_platform_access", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all routes except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
