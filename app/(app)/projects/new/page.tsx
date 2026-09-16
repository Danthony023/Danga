import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: "Untitled project",
    })
    .select("id")
    .single();

  if (error || !project) {
    redirect("/dashboard");
  }

  redirect(`/projects/${project.id}`);
}
