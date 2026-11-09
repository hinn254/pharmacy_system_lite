import { NextRequest } from "next/server";
import { authInstance } from "@/auth";
import { DEFAULT_DEMO_PASSWORD, DEMO_LOGIN_EMAILS } from "@/lib/demo-credentials";
import { DEMO_ROLE_EMAILS, isDemoRole } from "@/lib/demo-roles";
import { setCredentialPassword } from "@/lib/auth-users";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (process.env.ALLOW_PUBLIC_DEMO === "false") {
    return Response.json({ error: "The live demo is not available right now." }, { status: 404 });
  }
  const payload = (await request.json().catch(() => null)) as { role?: unknown } | null;
  const requestedRole = isDemoRole(payload?.role) ? payload.role : "ADMIN";
  const configuredAdminEmail = (process.env.DEMO_LOGIN_EMAIL ?? DEMO_LOGIN_EMAILS[0]).toLowerCase().trim();
  const preferredEmails = requestedRole === "ADMIN"
    ? [...new Set([configuredAdminEmail, DEMO_ROLE_EMAILS.ADMIN])]
    : [DEMO_ROLE_EMAILS[requestedRole]];
  const password = process.env.SEED_DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD;
  const preferredUsers = await prisma.user.findMany({
    where: {
      email: { in: preferredEmails },
      role: requestedRole,
      bannedAt: null,
      deletedAt: null,
      organization: {
        isDemo: true,
        slug: "main-pharmacy",
      },
    },
    select: {
      id: true,
      email: true,
      organization: { select: { id: true, slug: true, isDemo: true } },
    },
  });
  const demoUser = preferredEmails
    .map((preferredEmail) => preferredUsers.find((user) => user.email === preferredEmail))
    .find((user) => user !== undefined);

  if (!demoUser) {
    return Response.json(
      { error: `The ${requestedRole.toLowerCase().replace("_", " ")} demo account is being prepared. Run the production demo seed and try again.` },
      { status: 503 },
    );
  }

  const email = demoUser.email;
  try {
    let response = await authInstance.api.signInEmail({
      body: { email, password },
      headers: request.headers,
      asResponse: true,
    });
    if (!response.ok) {
      await setCredentialPassword(prisma, demoUser.id, password);
      response = await authInstance.api.signInEmail({
        body: { email, password },
        headers: request.headers,
        asResponse: true,
      });
      if (!response.ok) {
        return Response.json(
          { error: "The sample pharmacy sign-in needs to be refreshed. Please try again shortly." },
          { status: 503 },
        );
      }
    }
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store, max-age=0");
    headers.set("Pragma", "no-cache");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error("[demo/start]", error);
    return Response.json(
      { error: "The sample pharmacy could not be opened. Please try again shortly." },
      { status: 500 },
    );
  }
}
