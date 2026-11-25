"use client";

import { useChat } from "@ai-sdk/react";
import { useState, type FormEvent } from "react";

import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@/lib/chat/tools";

import { Message } from "./message";

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat<ChatMessage>();
  const busy = status === "submitted" || status === "streaming";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-12 pb-32">
      {messages.length === 0 && (
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Store Metrics</h1>
          <p className="text-muted-foreground">Ask about sales, orders, returns or repeat customers.</p>
        </div>
      )}
      {messages.map((message, index) => (
        <Message key={message.id} message={message} loading={busy && index === messages.length - 1} />
      ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
      <form onSubmit={submit} className="fixed inset-x-0 bottom-0 bg-background/80 py-4 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4">
          <Input
            className="h-12"
            value={input}
            placeholder="Ask about returns, sales, orders or repeat customers"
            aria-label="Question"
            disabled={busy}
            onChange={(event) => setInput(event.currentTarget.value)}
          />
        </div>
      </form>
    </main>
  );
}
