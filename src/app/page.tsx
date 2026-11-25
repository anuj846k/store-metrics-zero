"use client";

import { useChat } from "@ai-sdk/react";
import { isToolUIPart } from "ai";
import { useState } from "react";

import type { ChatMessage } from "@/lib/chat/tools";

import { MetricChart } from "./metric-chart";
import styles from "./page.module.css";
import { ToolCall } from "./tool-call";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat<ChatMessage>();

  return (
    <main className={styles.main}>
      {messages.map((message, index) => (
        <div key={message.id} className={styles.message}>
          <strong>{message.role === "user" ? "You" : "Store"}: </strong>
          {message.parts.map((part, i) => {
            if (part.type === "text") return <span key={i}>{part.text}</span>;
            if (isToolUIPart(part)) {
              return (
                <div key={i}>
                  <ToolCall part={part} />
                  {part.type !== "dynamic-tool" && (
                    <MetricChart
                      part={part}
                      loading={index === messages.length - 1 && (status === "submitted" || status === "streaming")}
                    />
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}
      {error && <div className={styles.error}>{error.message}</div>}

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input
          className={styles.input}
          value={input}
          placeholder="Ask about returns, sales, orders or repeat customers"
          disabled={status === "submitted" || status === "streaming"}
          onChange={(e) => setInput(e.currentTarget.value)}
        />
      </form>
    </main>
  );
}
