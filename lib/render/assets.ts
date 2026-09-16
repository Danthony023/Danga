import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveAssetSignedUrls(
  supabase: SupabaseClient,
  userId: string,
  assetIds: string[]
) {
  const uniqueIds = [...new Set(assetIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {};
  }

  const { data: assets, error } = await supabase
    .from("assets")
    .select("id, storage_path")
    .eq("user_id", userId)
    .in("id", uniqueIds);

  if (error || !assets) {
    throw new Error("Could not load assets for rendering.");
  }

  const urls: Record<string, string> = {};

  for (const asset of assets) {
    const { data, error: signedError } = await supabase.storage
      .from("assets")
      .createSignedUrl(asset.storage_path, 60 * 60);

    if (signedError || !data?.signedUrl) {
      throw new Error(`Could not access asset ${asset.id} for rendering.`);
    }

    urls[asset.id] = data.signedUrl;
  }

  const missing = uniqueIds.filter((id) => !urls[id]);
  if (missing.length > 0) {
    throw new Error("Some assets in the plan were not found in your library.");
  }

  return urls;
}
