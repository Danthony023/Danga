import { validateAssetFile } from "@/lib/assets/validation";
import { requireUser } from "@/lib/auth/session";
import type { AssetType } from "@/lib/types/database";
import {
  getStorageUsageBytes,
  wouldExceedStorageLimit,
} from "@/lib/storage/usage";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

const VALID_TYPES: AssetType[] = ["video", "audio", "image"];

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { user, supabase } = auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const typeValue = formData.get("type");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  if (typeof typeValue !== "string" || !VALID_TYPES.includes(typeValue as AssetType)) {
    return NextResponse.json(
      { error: "Type must be video, audio, or image." },
      { status: 400 }
    );
  }

  const type = typeValue as AssetType;
  const validation = validateAssetFile(file, type);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 400 });
  }

  let usedBytes: number;
  try {
    usedBytes = await getStorageUsageBytes(supabase, user.id);
  } catch {
    return NextResponse.json(
      { error: "Could not verify storage usage." },
      { status: 500 }
    );
  }

  if (wouldExceedStorageLimit(usedBytes, file.size, profile.plan)) {
    return NextResponse.json(
      {
        error:
          "Storage limit reached for your plan. Delete unused assets or upgrade to upload more.",
      },
      { status: 400 }
    );
  }

  const assetId = randomUUID();
  const storagePath = `${user.id}/${assetId}/${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }

  const { data: asset, error: insertError } = await supabase
    .from("assets")
    .insert({
      id: assetId,
      user_id: user.id,
      name: file.name,
      type,
      storage_path: storagePath,
      size_bytes: file.size,
    })
    .select("*")
    .single();

  if (insertError || !asset) {
    await supabase.storage.from("assets").remove([storagePath]);
    return NextResponse.json(
      { error: "Could not save asset metadata." },
      { status: 500 }
    );
  }

  return NextResponse.json(asset);
}
