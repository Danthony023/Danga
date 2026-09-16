import type { EditPlan } from "@/lib/types/project";

function uniqueTraits(traits: string[]) {
  return [...new Set(traits.map((trait) => trait.trim()).filter(Boolean))];
}

export function extractProjectStyleTraits(editPlan: unknown): string[] {
  if (!editPlan || typeof editPlan !== "object") {
    return [];
  }

  const plan = editPlan as EditPlan & {
    captions?: Array<{ style?: string }>;
    resolution?: string;
  };

  const traits: string[] = [];

  if (Array.isArray(plan.captions)) {
    for (const caption of plan.captions) {
      if (caption.style) {
        traits.push(`${caption.style} captions`);
      }
    }
  }

  if (typeof plan.resolution === "string") {
    traits.push(`${plan.resolution} exports`);
  }

  if (Array.isArray(plan.plan_items)) {
    for (const item of plan.plan_items) {
      if (item.type === "caption" && item.description) {
        traits.push(item.description);
      }
    }
  }

  return uniqueTraits(traits);
}

export function mergeStyleTraits(existing: string[], learned: string[]) {
  return uniqueTraits([...existing, ...learned]);
}
