import type { Tool } from "@/lib/ai/types";

export const PRODUCE_EDIT_PLAN_TOOL: Tool = {
  name: "produce_edit_plan",
  description:
    "Produce a structured edit plan when you have enough detail to assemble the video. " +
    "Use asset_id from the creator's library when referencing uploaded media. " +
    "Set render_ready to true only when the plan is complete enough to render.",
  parameters: {
    type: "object",
    properties: {
      plan_items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            step: { type: "integer" },
            description: { type: "string" },
            asset_id: { type: ["string", "null"] },
            type: {
              type: "string",
              enum: ["clip", "audio", "image", "caption", "transition"],
            },
          },
          required: ["step", "description", "asset_id", "type"],
        },
      },
      render_ready: { type: "boolean" },
      unachievable: {
        type: "array",
        items: {
          type: "object",
          properties: {
            task: { type: "string" },
            suggested_alternative: {
              type: "string",
              enum: ["slow_motion", "speed_ramp", "chroma_key", "stabilisation"],
            },
          },
          required: ["task", "suggested_alternative"],
        },
      },
    },
    required: ["plan_items", "render_ready", "unachievable"],
  },
};
