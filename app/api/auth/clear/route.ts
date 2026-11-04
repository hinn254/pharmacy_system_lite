import { NextResponse } from "next/server";

const COOKIE_NAMES = [
  // Auth.js / next-auth v5+ (primary)
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "__Host-authjs.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "__Host-authjs.callback-url",

  // next-auth v4 legacy (common in older deployments)
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "__Host-next-auth.session-token",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "__Host-next-auth.callback-url",
];

function clearAuthCookies(res: NextResponse, isHttps: boolean) {
  for (const name of COOKIE_NAMES) {
    res.cookies.set({
      name,
      value: "",
      path: "/",
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
    });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirectTo") || "/login";
  const isHttps = url.protocol === "https:";

  const res = NextResponse.redirect(new URL(redirectTo, url));
  clearAuthCookies(res, isHttps);
  return res;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const isHttps = url.protocol === "https:";
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res, isHttps);
  return res;
}
