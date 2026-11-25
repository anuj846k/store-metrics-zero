import { isToolUIPart } from "ai";
import { Streamdown } from "streamdown";

import { MetricView } from "@/components/metrics/metric-view";
import type { ChatMessage } from "@/lib/chat/tools";

import { ToolCall } from "./tool-call";

export function Message({ message, loading }: { message: ChatMessage; loading: boolean }) {
  if (message.role === "user") {
    const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
    return <p className="max-w-[85%] self-end rounded-2xl bg-muted px-4 py-2">{text}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <Streamdown key={i} isAnimating={loading}>
              {part.text}
            </Streamdown>
          );
        }
        if (isToolUIPart(part)) {
          return (
            <div key={i} className="flex flex-col gap-2">
              <ToolCall part={part} loading={loading} />
              {part.type !== "dynamic-tool" && <MetricView part={part} loading={loading} />}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
