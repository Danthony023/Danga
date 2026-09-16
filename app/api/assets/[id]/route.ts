import { requireUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { user, supabase } = auth;
  const { id } = await params;

  let body: { pinned?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.pinned !== "boolean") {
    return NextResponse.json({ error: "pinned must be a boolean." }, { status: 400 });
  }

  const { data: asset, error } = await supabase
    .from("assets")
    .update({ pinned: body.pinned })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  return NextResponse.json(asset);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { user, supabase } = auth;
  const { id } = await params;

  const { data: asset, error: fetchError } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  if (asset.pinned) {
    return NextResponse.json(
      { error: "Pinned assets cannot be deleted. Unpin first." },
      { status: 400 }
    );
  }

  const { error: storageError } = await supabase.storage
    .from("assets")
    .remove([asset.storage_path]);

  if (storageError) {
    return NextResponse.json(
      { error: "Could not remove file from storage." },
      { status: 500 }
    );
  }

  const { error: deleteError } = await supabase
    .from("assets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: "Could not delete asset." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
