export type PlanTier = "free" | "creator" | "pro";

export const PLAN_LIMITS = {
  free: { renders: 5, messages: 300, storageMb: 2048, resolution: "720p" as const },
  creator: {
    renders: 25,
    messages: 1500,
    storageMb: 10240,
    resolution: "1080p" as const,
  },
  pro: {
    renders: 90,
    messages: 5000,
    storageMb: 51200,
    resolution: "4k" as const,
  },
} satisfies Record<
  PlanTier,
  {
    renders: number;
    messages: number;
    storageMb: number;
    resolution: "720p" | "1080p" | "4k";
  }
>;

export function getPlanLimits(plan: string) {
  if (plan === "creator" || plan === "pro") {
    return PLAN_LIMITS[plan];
  }
  return PLAN_LIMITS.free;
}
