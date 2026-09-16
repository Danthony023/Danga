import { requireUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { user, supabase } = auth;
  const { id } = await params;

  const { data: version, error: versionError } = await supabase
    .from("versions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (versionError || !version) {
    return NextResponse.json({ error: "Version not found." }, { status: 404 });
  }

  if (!version.plan_snapshot) {
    return NextResponse.json(
      { error: "This version has no saved plan to revert to." },
      { status: 400 }
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .update({
      edit_plan: version.plan_snapshot,
      updated_at: new Date().toISOString(),
    })
    .eq("id", version.project_id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Could not revert project plan." }, { status: 500 });
  }

  return NextResponse.json({ project, version });
}
