import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runPharmacyChat } from "@/lib/ai/chat";
import { PHARMACY_AI_MODEL } from "@/lib/ai/tools";

export const runtime = "nodejs";

const bodySchema = z.object({
  pageContext: z.string().max(64),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(12000),
      }),
    )
    .min(1)
    .max(40),
});

function lastUserContent(
  messages: { role: "user" | "assistant"; content: string }[],
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const lastUser = lastUserContent(body.messages);
  if (!lastUser.trim()) {
    return NextResponse.json({ error: "Missing user message" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true },
  });
  const organizationName = org?.name ?? "Pharmacy";

  try {
    const result = await runPharmacyChat({
      messages: body.messages,
      pageContext: body.pageContext,
      organizationId: session.user.organizationId,
      organizationName,
      role: session.user.role,
    });

    await prisma.aiChatLog.create({
      data: {
        organizationId: session.user.organizationId,
        userId: session.user.id,
        pageContext: body.pageContext,
        userMessage: lastUser,
        assistantMessage: result.assistantMessage,
        model: PHARMACY_AI_MODEL,
        metadata: {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          rounds: result.usage.rounds,
        },
      },
    });

    return NextResponse.json({
      message: result.assistantMessage,
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Chat failed";
    const isConfig = errMsg.includes("OPENAI_API_KEY");

    try {
      await prisma.aiChatLog.create({
        data: {
          organizationId: session.user.organizationId,
          userId: session.user.id,
          pageContext: body.pageContext,
          userMessage: lastUser,
          assistantMessage: null,
          model: PHARMACY_AI_MODEL,
          metadata: { error: errMsg },
        },
      });
    } catch {
      /* ignore log failure */
    }

    return NextResponse.json(
      {
        error: isConfig
          ? "AI is not configured (missing OPENAI_API_KEY)."
          : errMsg,
      },
      { status: isConfig ? 503 : 500 },
    );
  }
}
