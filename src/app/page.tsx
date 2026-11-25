"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";

import styles from "./page.module.css";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();

  return (
    <main className={styles.main}>
      {messages.map((message) => (
        <div key={message.id} className={styles.message}>
          <strong>{message.role === "user" ? "You" : "Store"}: </strong>
          {message.parts.map((part, i) => {
            if (part.type === "text") return <span key={i}>{part.text}</span>;
            if (part.type.startsWith("tool-")) {
              return (
                <div key={i} className={styles.tool}>
                  {part.type.slice("tool-".length)}
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
