import type { SupabaseClient } from "@supabase/supabase-js";

export async function getNextVersionNumber(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
) {
  const { count, error } = await supabase
    .from("versions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) {
    throw new Error("Could not determine version number.");
  }

  return (count ?? 0) + 1;
}

export async function updateVersionFromCreatomate(
  supabase: SupabaseClient,
  versionId: string,
  userId: string,
  status: "done" | "failed" | "rendering",
  outputUrl?: string | null
) {
  const updates: Record<string, unknown> = { status };

  if (status === "done" && outputUrl) {
    updates.output_url = outputUrl;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    updates.expires_at = expiresAt.toISOString();
  }

  const { data, error } = await supabase
    .from("versions")
    .update(updates)
    .eq("id", versionId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Could not update version status.");
  }

  if (data.pinned) {
    await supabase
      .from("versions")
      .update({ expires_at: null })
      .eq("id", versionId)
      .eq("user_id", userId);
  }

  return data;
}
