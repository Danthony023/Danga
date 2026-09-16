import { getPlanLimits } from "@/lib/plans";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getStorageUsageBytes(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("assets")
    .select("size_bytes")
    .eq("user_id", userId);

  if (error) {
    throw new Error("Could not calculate storage usage.");
  }

  return (data ?? []).reduce((sum, row) => sum + Number(row.size_bytes), 0);
}

export function bytesToGb(bytes: number) {
  return bytes / (1024 * 1024 * 1024);
}

export function getStorageLimitBytes(plan: string) {
  return getPlanLimits(plan).storageMb * 1024 * 1024;
}

export function wouldExceedStorageLimit(
  usedBytes: number,
  incomingBytes: number,
  plan: string
) {
  return usedBytes + incomingBytes > getStorageLimitBytes(plan);
}
