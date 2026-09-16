import { requireUser } from "@/lib/auth/session";
import { getCreatomateRender, mapCreatomateStatus } from "@/lib/creatomate";
import { updateVersionFromCreatomate } from "@/lib/render/versions";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { user, supabase } = auth;
  const { jobId } = await params;
  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get("version_id");

  if (!versionId) {
    return NextResponse.json({ error: "version_id is required." }, { status: 400 });
  }

  const { data: version, error: versionError } = await supabase
    .from("versions")
    .select("*")
    .eq("id", versionId)
    .eq("user_id", user.id)
    .eq("render_job_id", jobId)
    .single();

  if (versionError || !version) {
    return NextResponse.json({ error: "Version not found." }, { status: 404 });
  }

  if (version.status === "done" || version.status === "failed") {
    return NextResponse.json({
      status: version.status,
      output_url: version.output_url,
      version_id: version.id,
    });
  }

  let creatomateRender;
  try {
    creatomateRender = await getCreatomateRender(jobId);
  } catch {
    return NextResponse.json(
      { error: "Could not check render status. Will retry." },
      { status: 502 }
    );
  }

  const mappedStatus = mapCreatomateStatus(creatomateRender.status);

  if (mappedStatus === "done" || mappedStatus === "failed") {
    const updated = await updateVersionFromCreatomate(
      supabase,
      version.id,
      user.id,
      mappedStatus,
      creatomateRender.url
    );

    if (mappedStatus === "done") {
      await supabase
        .from("projects")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", version.project_id)
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      status: updated.status,
      output_url: updated.output_url,
      version_id: updated.id,
      error_message: creatomateRender.error_message ?? null,
    });
  }

  return NextResponse.json({
    status: "rendering",
    version_id: version.id,
  });
}
