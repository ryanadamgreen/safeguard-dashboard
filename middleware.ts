import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/billing/success", "/dashboard"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Start with a response that passes the request through.
  // IMPORTANT: this reference is reassigned inside setAll when Supabase
  // needs to write refreshed tokens — always use this variable when returning.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // request.cookies only accepts (name, value) — no options.
          // Cookie attributes (Secure, SameSite, Path, MaxAge) are applied
          // below on the response, which is what the browser actually receives.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: call getUser() before any conditional branching.
  // This is what refreshes expiring access tokens and triggers setAll.
  // Moving this after an early-return meant tokens were never refreshed
  // on public paths, and any cookies written by setAll were lost.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log(
    "[middleware]",
    pathname,
    "user:", user?.email ?? null,
    "error:", error?.message ?? null
  );

  // Public paths, API routes, and Next.js internals pass through unconditionally.
  // Return `response` (not a bare NextResponse.next()) so any cookie updates
  // written by setAll above are propagated to the browser.
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return response;
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const redirectResponse = NextResponse.redirect(loginUrl);
    // Copy any cookie mutations (e.g. cleared expired tokens) onto the redirect
    // so the browser doesn't keep resending a stale session on subsequent requests.
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
