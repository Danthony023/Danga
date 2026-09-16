import type { AIResponse, Message, Tool } from "@/lib/ai/types";
import Anthropic from "@anthropic-ai/sdk";
import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type FunctionDeclarationSchemaProperty,
  type Tool as GeminiTool,
} from "@google/generative-ai";

export { APPROVED_ALTERNATIVES } from "@/lib/ai/alternatives";
export type { AIResponse, Message, Tool } from "@/lib/ai/types";

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function toUserFacingAIError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("GEMINI_API_KEY") || message.includes("ANTHROPIC_API_KEY")) {
    return new Error(message);
  }

  if (message.includes("no longer available") || message.includes("not found")) {
    return new Error(
      `Gemini model "${getGeminiModel()}" is unavailable. Set GEMINI_MODEL in .env.local (e.g. gemini-3.6-flash).`
    );
  }

  if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
    return new Error("Your Gemini API key is invalid. Check GEMINI_API_KEY in .env.local.");
  }

  return new Error("The AI assistant is temporarily unavailable. Please try again.");
}

function splitMessages(messages: Message[]) {
  const system = messages.find((message) => message.role === "system");
  const conversation = messages.filter((message) => message.role !== "system");
  return {
    systemPrompt: system?.content ?? "",
    conversation,
  };
}

function toGeminiProperty(
  schema: Record<string, unknown>
): FunctionDeclarationSchemaProperty {
  const type = schema.type;

  if (type === "object") {
    const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
    return {
      type: SchemaType.OBJECT,
      properties: properties
        ? Object.fromEntries(
            Object.entries(properties).map(([key, value]) => [key, toGeminiProperty(value)])
          )
        : {},
      required: Array.isArray(schema.required) ? schema.required : undefined,
    };
  }

  if (type === "array") {
    return {
      type: SchemaType.ARRAY,
      items: toGeminiProperty((schema.items as Record<string, unknown>) ?? {}),
    };
  }

  if (type === "integer") {
    return { type: SchemaType.INTEGER };
  }

  if (type === "boolean") {
    return { type: SchemaType.BOOLEAN };
  }

  if (Array.isArray(type)) {
    const filtered = type.filter((value) => value !== "null");
    if (filtered.length === 1 && filtered[0] === "string") {
      return { type: SchemaType.STRING, nullable: true };
    }
  }

  if (type === "string") {
    if (Array.isArray(schema.enum)) {
      return {
        type: SchemaType.STRING,
        format: "enum",
        enum: schema.enum.filter((value): value is string => typeof value === "string"),
      };
    }
    return { type: SchemaType.STRING };
  }

  return { type: SchemaType.STRING };
}

function toGeminiParameters(schema: Record<string, unknown>): FunctionDeclarationSchema {
  if (schema.type !== "object") {
    return { type: SchemaType.OBJECT, properties: {} };
  }

  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  return {
    type: SchemaType.OBJECT,
    properties: properties
      ? Object.fromEntries(
          Object.entries(properties).map(([key, value]) => [key, toGeminiProperty(value)])
        )
      : {},
    required: Array.isArray(schema.required) ? schema.required : undefined,
  };
}

async function chatWithGemini(messages: Message[], tools: Tool[]): Promise<AIResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const { systemPrompt, conversation } = splitMessages(messages);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: getGeminiModel(),
    systemInstruction: systemPrompt || undefined,
    tools:
      tools.length > 0
        ? ([
            {
              functionDeclarations: tools.map(
                (tool): FunctionDeclaration => ({
                  name: tool.name,
                  description: tool.description,
                  parameters: toGeminiParameters(tool.parameters),
                })
              ),
            },
          ] satisfies GeminiTool[])
        : undefined,
  });

  const history = conversation.slice(0, -1).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const lastMessage = conversation[conversation.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    throw new Error("The final message must be from the user.");
  }

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  const functionCalls = result.response.functionCalls();

  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    return {
      type: "tool_call",
      name: call.name,
      input: (call.args ?? {}) as Record<string, unknown>,
    };
  }

  return {
    type: "text",
    text: result.response.text(),
  };
}

async function chatWithClaude(messages: Message[], tools: Tool[]): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const { systemPrompt, conversation } = splitMessages(messages);
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt || undefined,
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Tool.InputSchema,
    })),
    messages: conversation.map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    })),
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (toolUse && toolUse.type === "tool_use") {
    return {
      type: "tool_call",
      name: toolUse.name,
      input: toolUse.input as Record<string, unknown>,
    };
  }

  const textBlock = response.content.find((block) => block.type === "text");
  return {
    type: "text",
    text: textBlock && textBlock.type === "text" ? textBlock.text : "",
  };
}

export async function chatWithAI(messages: Message[], tools: Tool[]): Promise<AIResponse> {
  const provider = process.env.AI_PROVIDER ?? "gemini";

  try {
    if (provider === "claude") {
      return await chatWithClaude(messages, tools);
    }
    return await chatWithGemini(messages, tools);
  } catch (error) {
    throw toUserFacingAIError(error);
  }
}

export async function analyseImageWithAI(
  imageBase64: string,
  prompt: string
): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? "gemini";

  try {
    if (provider === "claude") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is not configured.");
      }

      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: imageBase64,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      return textBlock && textBlock.type === "text" ? textBlock.text : "";
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: getGeminiModel() });
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      },
    ]);

    return result.response.text();
  } catch (error) {
    throw toUserFacingAIError(error);
  }
}
