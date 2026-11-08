import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request));

  if (pathname.startsWith("/api/mpesa/callback") || pathname.startsWith("/api/paystack/webhook") || pathname.startsWith("/api/cron")) return NextResponse.next();

  const isPublic =
    pathname === "/" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/icon" ||
    pathname === "/apple-icon" ||
    pathname === "/opengraph-image" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/clear-session") ||
    pathname.startsWith("/api/demo/start") ||
    pathname.startsWith("/api/auth");

  if (isPublic) {
    if (hasSessionCookie && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const isPrivate =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/consultations") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/doctor") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/patients") ||
    pathname.startsWith("/pos");

  if (isPrivate && !hasSessionCookie) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
