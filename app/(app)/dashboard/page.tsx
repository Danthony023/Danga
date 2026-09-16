import { DashboardClient } from "./dashboard-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: assets }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("assets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const rawTraits = profile?.style_traits;
  const styleTraits = Array.isArray(rawTraits)
    ? rawTraits.filter((trait: unknown): trait is string => typeof trait === "string")
    : [];

  return (
    <DashboardClient
      initialAssets={assets ?? []}
      styleTraits={styleTraits}
      plan={profile?.plan ?? "free"}
    />
  );
}
