import { NextRequest } from "next/server";
import { authInstance } from "@/auth";
import { DEFAULT_DEMO_PASSWORD, DEMO_LOGIN_EMAILS } from "@/lib/demo-credentials";
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
  const email = (process.env.DEMO_LOGIN_EMAIL ?? DEMO_LOGIN_EMAILS[0]).toLowerCase().trim();
  const password = process.env.SEED_DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD;
  const demoUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      organization: { select: { id: true, slug: true, isDemo: true } },
    },
  });
  if (!demoUser || (!demoUser.organization.isDemo && demoUser.organization.slug !== "main-pharmacy")) {
    return Response.json(
      { error: "The sample pharmacy is being prepared. Please try again shortly." },
      { status: 503 },
    );
  }

  if (!demoUser.organization.isDemo) {
    await prisma.organization.update({
      where: { id: demoUser.organization.id },
      data: { isDemo: true, demoExpiresAt: null },
    });
  }

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
    return response;
  } catch (error) {
    console.error("[demo/start]", error);
    return Response.json(
      { error: "The sample pharmacy could not be opened. Please try again shortly." },
      { status: 500 },
    );
  }
}
