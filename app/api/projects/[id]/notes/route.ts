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

  let body: { notes?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.notes !== "string") {
    return NextResponse.json({ error: "notes must be a string." }, { status: 400 });
  }

  const { data: project, error } = await supabase
    .from("projects")
    .update({
      notes: body.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, notes")
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Could not save notes." }, { status: 500 });
  }

  return NextResponse.json(project);
}
