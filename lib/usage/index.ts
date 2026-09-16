import { getPlanLimits } from "@/lib/plans";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Match Supabase/Postgres `date_trunc('month', now())` (UTC). */
export function getCurrentPeriodStart(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export async function getOrCreateUsage(supabase: SupabaseClient, userId: string) {
  const periodStart = getCurrentPeriodStart();

  const { data: existing, error: fetchError } = await supabase
    .from("usage")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .maybeSingle();

  if (fetchError) {
    throw new Error("Could not load usage.");
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: insertError } = await supabase
    .from("usage")
    .insert({
      user_id: userId,
      period_start: periodStart,
      renders_used: 0,
      messages_used: 0,
    })
    .select("*")
    .single();

  if (!insertError && created) {
    return created;
  }

  // Another request may have created the row (React strict mode, parallel loads).
  if (insertError?.code === "23505") {
    const { data: raced } = await supabase
      .from("usage")
      .select("*")
      .eq("user_id", userId)
      .eq("period_start", periodStart)
      .single();

    if (raced) {
      return raced;
    }
  }

  // Signup trigger row can exist under the correct month even if our insert failed.
  const { data: latest } = await supabase
    .from("usage")
    .select("*")
    .eq("user_id", userId)
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) {
    return latest;
  }

  throw new Error("Could not initialize usage.");
}

export async function getUsageSummary(supabase: SupabaseClient, userId: string, plan: string) {
  const usage = await getOrCreateUsage(supabase, userId);
  const limits = getPlanLimits(plan);

  return {
    renders_used: usage.renders_used,
    renders_limit: limits.renders,
    messages_used: usage.messages_used,
    messages_limit: limits.messages,
    renders_remaining: Math.max(0, limits.renders - usage.renders_used),
    messages_remaining: Math.max(0, limits.messages - usage.messages_used),
  };
}

export async function assertMessageQuota(
  supabase: SupabaseClient,
  userId: string,
  plan: string
) {
  const usage = await getOrCreateUsage(supabase, userId);
  const limit = getPlanLimits(plan).messages;

  if (usage.messages_used >= limit) {
    return {
      ok: false as const,
      message: "Monthly message limit reached. Upgrade your plan or wait until next month.",
    };
  }

  return { ok: true as const, usage };
}

export async function assertRenderQuota(
  supabase: SupabaseClient,
  userId: string,
  plan: string
) {
  const usage = await getOrCreateUsage(supabase, userId);
  const limit = getPlanLimits(plan).renders;

  if (usage.renders_used >= limit) {
    return {
      ok: false as const,
      message: "Monthly render limit reached. Upgrade your plan or wait until next month.",
    };
  }

  return { ok: true as const, usage };
}

export async function incrementRendersUsed(supabase: SupabaseClient, userId: string) {
  const usage = await getOrCreateUsage(supabase, userId);

  const { error } = await supabase
    .from("usage")
    .update({
      renders_used: usage.renders_used + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", usage.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error("Could not update render usage.");
  }
}

export async function incrementMessagesUsed(supabase: SupabaseClient, userId: string) {
  const usage = await getOrCreateUsage(supabase, userId);

  const { error } = await supabase
    .from("usage")
    .update({
      messages_used: usage.messages_used + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", usage.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error("Could not update message usage.");
  }
}
