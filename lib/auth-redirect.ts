import { redirect } from "next/navigation";

/**
 * When the session cookie exists but `auth()` cannot build a session (expired secret,
 * corrupted JWT, edge vs Node mismatch), a plain `/login` redirect loops with middleware:
 * dashboard → login → dashboard (ERR_TOO_MANY_REDIRECTS). Clearing Auth.js cookies first
 * fixes that.
 */
export function redirectToLoginClearingSession(): never {
  redirect("/api/auth/clear?redirectTo=/login");
}
