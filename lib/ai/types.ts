export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type Tool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type AIResponse =
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; input: Record<string, unknown> };
