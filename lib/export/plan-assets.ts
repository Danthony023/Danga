export function extractAssetIdsFromPlan(plan: unknown): string[] {
  if (!plan || typeof plan !== "object") {
    return [];
  }

  const ids = new Set<string>();
  const record = plan as {
    clips?: Array<{ asset_id?: string }>;
    audio?: { asset_id?: string } | null;
    plan_items?: Array<{ asset_id?: string | null }>;
  };

  if (Array.isArray(record.clips)) {
    for (const clip of record.clips) {
      if (clip.asset_id) {
        ids.add(clip.asset_id);
      }
    }
  }

  if (record.audio?.asset_id) {
    ids.add(record.audio.asset_id);
  }

  if (Array.isArray(record.plan_items)) {
    for (const item of record.plan_items) {
      if (item.asset_id) {
        ids.add(item.asset_id);
      }
    }
  }

  return [...ids];
}
