import { getToolName, type DynamicToolUIPart, type ToolUIPart } from "ai";

import type { ChatTools } from "@/lib/chat/tools";

import styles from "./page.module.css";

type Part = ToolUIPart<ChatTools> | DynamicToolUIPart;

const STATE_LABELS: Record<Part["state"], string> = {
  "input-streaming": "preparing",
  "input-available": "running",
  "approval-requested": "waiting for approval",
  "approval-responded": "approved",
  "output-available": "done",
  "output-error": "failed",
  "output-denied": "denied",
};

/** One tool call: the tool name, its state, the input from the model and the output from the metric. */
export function ToolCall({ part }: { part: Part }) {
  return (
    <details className={styles.tool}>
      <summary>
        {getToolName(part)} · {STATE_LABELS[part.state]}
      </summary>
      {part.input !== undefined && <pre>input: {JSON.stringify(part.input, null, 2)}</pre>}
      {part.state === "output-available" && <pre>output: {JSON.stringify(part.output, null, 2)}</pre>}
      {part.state === "output-error" && <div className={styles.error}>{part.errorText}</div>}
    </details>
  );
}
