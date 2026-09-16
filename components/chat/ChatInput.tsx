"use client";

import { Button } from "@/components/ui/button";
import { FormEvent, useState } from "react";

interface ChatInputProps {
  disabled?: boolean;
  onSend: (message: string) => Promise<void>;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = message.trim();
    if (!value || disabled || sending) {
      return;
    }

    setSending(true);
    setMessage("");
    try {
      await onSend(value);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Describe the edit you want…"
        rows={2}
        disabled={disabled || sending}
        className="min-h-[44px] flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-violet-500 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSubmit(event);
          }
        }}
      />
      <Button type="submit" disabled={disabled || sending || !message.trim()} className="self-end">
        {sending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
