import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { UserRole } from "@prisma/client";
import {
  executePharmacyTool,
  PHARMACY_AI_MODEL,
  pharmacyTools,
  type ToolContext,
} from "./tools";

function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey: key });
}

function buildSystemPrompt(organizationName: string, pageContext: string): string {
  return [
    `You are "Ask my pharmacy", an assistant for the pharmacy "${organizationName}".`,
    `The staff member is viewing context: ${pageContext}. Tailor brief intros when helpful.`,
    "Rules:",
    "- Use the provided tools for any factual data: sales totals, stock, drugs, analytics.",
    "- Never invent quantities, prices, batch counts, or revenue. If tools return empty or errors, say so clearly.",
    "- For admin-only tools, if the tool returns an error about permissions, explain that an administrator can run that report.",
    "- Keep answers concise and practical. Use the same currency/units as in tool results.",
    "- Do not request or repeat patient identifiable information.",
  ].join("\n");
}

export async function runPharmacyChat(params: {
  messages: { role: "user" | "assistant"; content: string }[];
  pageContext: string;
  organizationId: string;
  organizationName: string;
  role: UserRole;
}): Promise<{
  assistantMessage: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number; rounds: number };
}> {
  const client = getClient();
  const toolCtx: ToolContext = {
    organizationId: params.organizationId,
    role: params.role,
  };

  const system: ChatCompletionMessageParam = {
    role: "system",
    content: buildSystemPrompt(params.organizationName, params.pageContext),
  };

  const conversation: ChatCompletionMessageParam[] = params.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let promptTokens = 0;
  let completionTokens = 0;
  let rounds = 0;
  const maxRounds = 8;

  const messages: ChatCompletionMessageParam[] = [system, ...conversation];

  while (rounds < maxRounds) {
    rounds += 1;
    const completion = await client.chat.completions.create({
      model: PHARMACY_AI_MODEL,
      messages,
      tools: pharmacyTools,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    if (!choice) {
      throw new Error("No completion choice returned");
    }

    if (completion.usage) {
      promptTokens += completion.usage.prompt_tokens ?? 0;
      completionTokens += completion.usage.completion_tokens ?? 0;
    }

    const msg = choice.message;

    if (!msg.tool_calls?.length) {
      const text = msg.content?.trim() ?? "";
      return {
        assistantMessage:
          text || "I could not generate a reply. Please try rephrasing your question.",
        model: PHARMACY_AI_MODEL,
        usage: { promptTokens, completionTokens, rounds },
      };
    }

    messages.push({
      role: "assistant",
      content: msg.content,
      tool_calls: msg.tool_calls,
    });

    for (const tc of msg.tool_calls) {
      if (tc.type !== "function") continue;
      const name = tc.function.name;
      let args: unknown = {};
      try {
        args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        args = {};
      }
      const { result, error } = await executePharmacyTool(name, args, toolCtx);
      const payload =
        error !== undefined
          ? { ok: false as const, error }
          : { ok: true as const, data: result };
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(payload),
      });
    }
  }

  return {
    assistantMessage:
      "The request took too many steps. Please try a simpler question or try again.",
    model: PHARMACY_AI_MODEL,
    usage: { promptTokens, completionTokens, rounds },
  };
}
