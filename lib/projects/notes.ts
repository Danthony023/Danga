import { APPROVED_ALTERNATIVES } from "@/lib/ai/alternatives";
import type { UnachievableItem } from "@/lib/types/project";

export function formatNotesTimestamp(date = new Date()) {
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function appendUnachievableToNotes(
  existingNotes: string | null | undefined,
  unachievable: UnachievableItem[],
  timestamp = new Date()
): string {
  if (unachievable.length === 0) {
    return existingNotes?.trim() ?? "";
  }

  const header = `What we couldn't do — ${formatNotesTimestamp(timestamp)}`;
  const lines = unachievable.map((item) => {
    const alternative =
      APPROVED_ALTERNATIVES[item.suggested_alternative] ?? item.suggested_alternative;
    return `- ${item.task}: ${alternative}`;
  });

  const block = [header, ...lines].join("\n");
  const base = existingNotes?.trim();
  return base ? `${base}\n\n${block}` : block;
}
