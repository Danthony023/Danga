import { ProjectClient } from "./project-client";
import { parseChatHistory } from "@/lib/projects/chat-history";
import { parseVersion } from "@/lib/types/version";
import { getUsageSummary } from "@/lib/usage";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function ProjectPage({
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

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !project) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const [{ data: versionRows }, usage] = await Promise.all([
    supabase
      .from("versions")
      .select("*")
      .eq("project_id", project.id)
      .eq("user_id", user.id)
      .order("version_number", { ascending: true }),
    getUsageSummary(supabase, user.id, profile?.plan ?? "free"),
  ]);

  const messages = parseChatHistory(project.chat_history);
  const versions = (versionRows ?? [])
    .map((row) => parseVersion(row as Record<string, unknown>))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <ProjectClient
      projectId={project.id}
      initialMessages={messages}
      initialUsage={usage}
      initialVersions={versions}
      initialNotes={project.notes ?? ""}
    />
  );
}
