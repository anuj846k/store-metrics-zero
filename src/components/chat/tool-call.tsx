import { getToolName, type DynamicToolUIPart, type ToolUIPart } from "ai";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ChatTools } from "@/lib/chat/tools";

type Part = ToolUIPart<ChatTools> | DynamicToolUIPart;
type Status = { label: string; variant: "secondary" | "outline" | "destructive" };

const STATUS: Record<Part["state"], Status> = {
  "input-streaming": { label: "preparing", variant: "outline" },
  "input-available": { label: "running", variant: "outline" },
  "approval-requested": { label: "waiting for approval", variant: "outline" },
  "approval-responded": { label: "approved", variant: "outline" },
  "output-available": { label: "done", variant: "secondary" },
  "output-error": { label: "failed", variant: "destructive" },
  "output-denied": { label: "denied", variant: "destructive" },
};

const STOPPED: Status = { label: "stopped", variant: "destructive" };

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function ToolCall({ part, loading }: { part: Part; loading: boolean }) {
  const running = part.state === "input-streaming" || part.state === "input-available";
  const status = running && !loading ? STOPPED : STATUS[part.state];

  return (
    <Collapsible className="rounded-lg border">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 font-mono text-sm">
        <ChevronRight className="size-4 transition-transform group-data-[state=open]:rotate-90" />
        {getToolName(part)}
        <Badge variant={status.variant} className="ml-auto">
          {status.label}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-2 border-t px-3 py-2 font-mono text-xs">
        {part.input !== undefined && <pre className="overflow-x-auto">input: {json(part.input)}</pre>}
        {part.state === "output-available" && <pre className="overflow-x-auto">output: {json(part.output)}</pre>}
        {part.state === "output-error" && <p className="text-destructive">{part.errorText}</p>}
      </CollapsibleContent>
    </Collapsible>
  );
}
