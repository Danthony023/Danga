import { ExportCard } from "@/components/export/ExportCard";
import { estimateDurationFromPlan } from "@/lib/export/srt";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: version, error } = await supabase
    .from("versions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !version) {
    notFound();
  }

  if (version.status !== "done" || !version.output_url) {
    notFound();
  }

  const { data: project } = await supabase
    .from("projects")
    .select("edit_plan")
    .eq("id", version.project_id)
    .eq("user_id", user.id)
    .single();

  const plan = version.plan_snapshot ?? project?.edit_plan;
  const durationSeconds = estimateDurationFromPlan(plan);

  return (
    <ExportCard
      versionId={version.id}
      versionNumber={version.version_number}
      outputUrl={version.output_url}
      resolution={version.resolution}
      durationSeconds={durationSeconds}
      projectId={version.project_id}
    />
  );
}
