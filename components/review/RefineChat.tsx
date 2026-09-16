"use client";

import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { PlanCard, type UsageSummary } from "@/components/chat/PlanCard";
import type { ChatMessage, EditPlan } from "@/lib/types/project";
import { ReactNode, RefObject } from "react";

interface RefineChatProps {
  messages: ChatMessage[];
  activePlan: { plan: EditPlan; usage: UsageSummary } | null;
  loading: boolean;
  rendering: boolean;
  error: string | null;
  threadRef: RefObject<HTMLDivElement | null>;
  onSend: (message: string) => Promise<void>;
  onAdjustPlan: () => void;
  onRender: () => void;
  header?: ReactNode;
}

export function RefineChat({
  messages,
  activePlan,
  loading,
  rendering,
  error,
  threadRef,
  onSend,
  onAdjustPlan,
  onRender,
  header,
}: RefineChatProps) {
  return (
    <div className="flex min-h-[420px] flex-col gap-4">
      {header}

      <div
        ref={threadRef}
        className="max-h-[360px] flex-1 space-y-3 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Try: &quot;Make the captions bigger and trim the intro to 2 seconds.&quot;
          </p>
        ) : (
          messages.map((message, index) => (
            <ChatBubble
              key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
              role={message.role}
              content={message.content}
            />
          ))
        )}

        {loading ? (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              Danga is thinking…
            </div>
          </div>
        ) : null}

        {activePlan ? (
          <PlanCard
            plan={activePlan.plan}
            usage={activePlan.usage}
            rendering={rendering}
            onAdjust={onAdjustPlan}
            onRender={onRender}
          />
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <ChatInput disabled={loading} onSend={onSend} />
    </div>
  );
}
