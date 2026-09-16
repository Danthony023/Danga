import { APPROVED_ALTERNATIVES } from "@/lib/ai/alternatives";
import type { EditPlan, PlanItem, UnachievableItem } from "@/lib/types/project";

function isPlanItemType(value: unknown): value is PlanItem["type"] {
  return (
    value === "clip" ||
    value === "audio" ||
    value === "image" ||
    value === "caption" ||
    value === "transition"
  );
}

export function parseEditPlan(input: Record<string, unknown>): EditPlan | null {
  if (!Array.isArray(input.plan_items) || typeof input.render_ready !== "boolean") {
    return null;
  }

  const planItems: PlanItem[] = [];
  for (const item of input.plan_items) {
    if (!item || typeof item !== "object") {
      return null;
    }
    const row = item as Record<string, unknown>;
    if (
      typeof row.step !== "number" ||
      typeof row.description !== "string" ||
      !isPlanItemType(row.type)
    ) {
      return null;
    }
    const assetId =
      row.asset_id === null || typeof row.asset_id === "string" ? row.asset_id : null;
    planItems.push({
      step: row.step,
      description: row.description,
      asset_id: assetId,
      type: row.type,
    });
  }

  const unachievable: UnachievableItem[] = [];
  const rawUnachievable = Array.isArray(input.unachievable) ? input.unachievable : [];
  for (const item of rawUnachievable) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (typeof row.task !== "string" || typeof row.suggested_alternative !== "string") {
      continue;
    }
    if (!(row.suggested_alternative in APPROVED_ALTERNATIVES)) {
      continue;
    }
    unachievable.push({
      task: row.task,
      suggested_alternative: row.suggested_alternative,
    });
  }

  return {
    plan_items: planItems.sort((a, b) => a.step - b.step),
    render_ready: input.render_ready,
    unachievable,
  };
}

export function summarizeEditPlan(plan: EditPlan) {
  const steps = plan.plan_items
    .map((item) => `${item.step}. ${item.description}`)
    .join("\n");

  const limitations = plan.unachievable
    .map((item) => {
      const alt =
        APPROVED_ALTERNATIVES[item.suggested_alternative as keyof typeof APPROVED_ALTERNATIVES];
      return `- ${item.task}${alt ? `: ${alt}` : ""}`;
    })
    .join("\n");

  let summary = "Here's your edit plan:\n\n" + steps;
  if (limitations) {
    summary += "\n\nA few things we'll handle outside Danga:\n" + limitations;
  }
  if (plan.render_ready) {
    summary += "\n\nThis plan is ready to render when you are.";
  }
  return summary;
}
