import { APPROVED_ALTERNATIVES, APPROVED_ALTERNATIVE_KEYS } from "@/lib/ai/alternatives";
import type { Asset } from "@/lib/types/database";
import type { ChatMessage } from "@/lib/types/project";

export function buildChatSystemPrompt({
  styleTraits,
  assets,
  chatHistory,
  notes,
}: {
  styleTraits: string[];
  assets: Pick<Asset, "id" | "name" | "type" | "duration_seconds">[];
  chatHistory: ChatMessage[];
  notes?: string | null;
}) {
  const traitsText =
    styleTraits.length > 0
      ? styleTraits.map((trait) => `- ${trait}`).join("\n")
      : "- No saved style traits yet.";

  const assetsText =
    assets.length > 0
      ? assets
          .map((asset) => {
            const duration =
              asset.duration_seconds != null
                ? `${Math.round(Number(asset.duration_seconds))}s`
                : "unknown duration";
            return `- ${asset.id} | ${asset.name} | ${asset.type} | ${duration}`;
          })
          .join("\n")
      : "- No uploaded assets yet.";

  const alternativesText = APPROVED_ALTERNATIVE_KEYS.map(
    (key) => `- ${key}: ${APPROVED_ALTERNATIVES[key]}`
  ).join("\n");

  const notesText = notes?.trim()
    ? notes.trim()
    : "No project notes yet.";

  const historyHint =
    chatHistory.length > 0
      ? "Continue the conversation based on the chat history provided in the messages."
      : "This is the start of the project conversation.";

  return `You are Danga, an AI video editing assistant for short-form creators.

Your job is to help the creator plan edits they can render inside Danga. Ask clarifying questions when needed. When you have enough detail, call the produce_edit_plan tool.

Creator style traits:
${traitsText}

Available assets (id | name | type | duration):
${assetsText}

Project notes:
${notesText}

Approved unachievable alternatives (use ONLY these keys in suggested_alternative):
${alternativesText}

Rules:
- Never invent suggested_alternative values outside the approved keys list.
- Reference asset_id values exactly as listed when using library media.
- Prefer concise, creator-friendly language.
- Do not call produce_edit_plan until the creator's intent is clear enough to render or iterate.
- ${historyHint}`;
}
