import { NextRequest } from "next/server";
import { authInstance } from "@/auth";
import { createDemoWorkspace, deleteDemoWorkspace } from "@/lib/demo/workspace";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const LAUNCH_COOKIE = "pharmacy-os-demo-launch";
const LAUNCH_COOLDOWN_SECONDS = 30 * 60;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (process.env.ALLOW_PUBLIC_DEMO === "false") {
    return Response.json({ error: "The live demo is not available right now." }, { status: 404 });
  }
  if (request.cookies.has(LAUNCH_COOKIE)) {
    return Response.json(
      { error: "You recently started a demo. Please wait a little before creating another." },
      { status: 429 },
    );
  }

  const maximumActive = Number.parseInt(process.env.DEMO_MAX_ACTIVE ?? "50", 10);
  const activeDemoCount = await prisma.organization.count({
    where: { isDemo: true, demoExpiresAt: { gt: new Date() } },
  });
  if (activeDemoCount >= (Number.isFinite(maximumActive) ? maximumActive : 50)) {
    return Response.json(
      { error: "All demo workspaces are busy right now. Please try again shortly." },
      { status: 503 },
    );
  }

  let demo: Awaited<ReturnType<typeof createDemoWorkspace>> | null = null;
  try {
    demo = await createDemoWorkspace();
    const response = await authInstance.api.signInEmail({
      body: { email: demo.email, password: demo.password },
      headers: request.headers,
      asResponse: true,
    });
    if (!response.ok) {
      await deleteDemoWorkspace(demo.organizationId);
      return Response.json({ error: "We could not open the demo. Please try again." }, { status: 500 });
    }

    response.headers.append(
      "Set-Cookie",
      `${LAUNCH_COOKIE}=1; Path=/; Max-Age=${LAUNCH_COOLDOWN_SECONDS}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    return response;
  } catch (error) {
    if (demo) {
      await deleteDemoWorkspace(demo.organizationId).catch(() => undefined);
    }
    console.error("[demo/start]", error);
    return Response.json(
      { error: "We could not prepare the demo workspace. Please try again." },
      { status: 500 },
    );
  }
}
