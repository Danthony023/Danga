import { extractCaptionsFromPlan, generateSrt } from "@/lib/export/srt";
import { requireUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET(
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

  const { data: project } = await supabase
    .from("projects")
    .select("edit_plan")
    .eq("id", version.project_id)
    .eq("user_id", user.id)
    .single();

  const plan = version.plan_snapshot ?? project?.edit_plan;
  const captions = extractCaptionsFromPlan(plan);

  if (captions.length === 0) {
    return NextResponse.json({ error: "No captions found for this version." }, { status: 404 });
  }

  const srt = generateSrt(captions);
  return new NextResponse(srt, {
    headers: {
      "Content-Type": "application/x-subrip; charset=utf-8",
      "Content-Disposition": `attachment; filename="danga-v${version.version_number}.srt"`,
    },
  });
}
