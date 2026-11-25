import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

import { storeToday } from "@/lib/chat/dates";
import { tools } from "@/lib/chat/tools";

export const maxDuration = 30;

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

function instructions(): string {
  return `You answer a store owner's questions about their orders. Today is ${storeToday()}.
- Use a tool for each number. Do not guess numbers.
- Give the date phrase of the owner to the tool as "range". Do not calculate dates yourself.
- Tell the exact start and end dates from the tool result in the answer.
- If hasOrders is false, say "There are no orders from <start> to <end>". Do not say the sales were 0.
- To compare two periods, call the tool two times with periods of the same type.
- The data has no ad spend, ROAS, or cost. If the owner asks for these, say that the data does not have them.`;
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const question = messages.at(-1)?.parts.find((part) => part.type === "text")?.text;
  console.log(`[chat] question: ${JSON.stringify(question)}`);

  const result = streamText({
    model: openrouter.chat(process.env.OPENROUTER_MODEL ?? "google/gemini-3.5-flash-lite"),
    instructions: instructions(),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: isStepCount(5),
    // Log each step in the server terminal: the tool calls, their results, and the answer.
    onStepEnd: (step) => {
      for (const call of step.toolCalls) {
        console.log(`[chat] step ${step.stepNumber} tool call: ${call.toolName} ${JSON.stringify(call.input)}`);
      }
      for (const result of step.toolResults) {
        console.log(`[chat] step ${step.stepNumber} tool result: ${result.toolName} ${JSON.stringify(result.output)}`);
      }
      if (step.text) console.log(`[chat] step ${step.stepNumber} answer: ${step.text}`);
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // Show the cause (for example, a rate limit) in dev. Do not show internal errors in prod.
      onError: (error) =>
        process.env.NODE_ENV === "production" || !(error instanceof Error)
          ? "The answer failed. Try again."
          : error.message,
    }),
  });
}
