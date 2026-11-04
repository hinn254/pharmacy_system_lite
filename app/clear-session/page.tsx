import { redirect } from "next/navigation";

export default function ClearSessionPage() {
  // This page is just a safe entrypoint for users who can't load app pages.
  // We use a redirect to the clearing endpoint which issues Set-Cookie deletes.
  redirect("/api/auth/clear?redirectTo=/login");
}

