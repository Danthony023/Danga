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

  const { data: existing, error: fetchError } = await supabase
    .from("versions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Version not found." }, { status: 404 });
  }

  const updates: Record<string, unknown> = { pinned: body.pinned };

  if (body.pinned) {
    updates.expires_at = null;
  } else if (existing.status === "done" && existing.output_url) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    updates.expires_at = expiresAt.toISOString();
  }

  const { data: version, error } = await supabase
    .from("versions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !version) {
    return NextResponse.json({ error: "Could not update version." }, { status: 500 });
  }

  return NextResponse.json(version);
}
