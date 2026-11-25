import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
  type StepResult,
  type ToolSet,
} from "ai";

import { storeToday } from "@/lib/chat/dates";
import { tools, type ChatMessage } from "@/lib/chat/tools";

export const maxDuration = 30;

const DEFAULT_MODEL = "google/gemini-3.5-flash-lite";
const MAX_STEPS = 5;
const isProduction = process.env.NODE_ENV === "production";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

function instructions(): string {
  return `You answer a store owner's questions about their orders. Today is ${storeToday()}.
- Use a tool for each number. Do not guess numbers, and do not add numbers yourself: use the totals in the tool result.
- Give the date phrase of the owner to the tool as "range". Do not calculate dates yourself.
- Tell the exact start and end dates from the tool result in the answer.
- If hasOrders is false, say "There are no orders from <start> to <end>". Do not say the sales were 0.
- To compare two periods or two channels, call the tool two times.
- The data has no ad spend, ROAS, cost or stock. If the owner asks for these, say that the data does not have them, and do not call a tool.`;
}

function logStep(step: StepResult<ToolSet>) {
  for (const call of step.toolCalls) {
    console.log(`[chat] step ${step.stepNumber} tool call: ${call.toolName} ${JSON.stringify(call.input)}`);
  }
  if (step.text) console.log(`[chat] step ${step.stepNumber} answer: ${step.text}`);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const validation = await safeValidateUIMessages<ChatMessage>({ messages: body?.messages, tools });
  if (!validation.success) {
    return Response.json({ error: "The request has no valid messages." }, { status: 400 });
  }

  const result = streamText({
    model: openrouter.chat(process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL),
    instructions: instructions(),
    messages: await convertToModelMessages(validation.data),
    tools,
    stopWhen: isStepCount(MAX_STEPS),
    onStepEnd: isProduction ? undefined : logStep,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) =>
        isProduction || !(error instanceof Error) ? "The answer failed. Try again." : error.message,
    }),
  });
}
