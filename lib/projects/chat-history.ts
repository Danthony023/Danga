import type { ChatMessage, EditPlan } from "@/lib/types/project";

function isEditPlan(value: unknown): value is EditPlan {
  if (!value || typeof value !== "object") {
    return false;
  }
  const plan = value as EditPlan;
  return Array.isArray(plan.plan_items) && typeof plan.render_ready === "boolean";
}

export function parseChatHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const messages: ChatMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (row.role !== "user" && row.role !== "assistant") {
      continue;
    }
    if (typeof row.content !== "string") {
      continue;
    }
    const message: ChatMessage = {
      role: row.role,
      content: row.content,
    };
    if (isEditPlan(row.plan)) {
      message.plan = row.plan;
    }
    messages.push(message);
  }

  return messages;
}
