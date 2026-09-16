import { extractProjectStyleTraits, mergeStyleTraits } from "@/lib/export/style-traits";
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

  const { data: project } = await supabase
    .from("projects")
    .select("edit_plan")
    .eq("id", version.project_id)
    .eq("user_id", user.id)
    .single();

  const plan = version.plan_snapshot ?? project?.edit_plan;
  const learnedTraits = extractProjectStyleTraits(plan);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("style_traits")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const existing = Array.isArray(profile.style_traits)
    ? profile.style_traits.filter((trait: unknown): trait is string => typeof trait === "string")
    : [];

  const merged = mergeStyleTraits(existing, learnedTraits);

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ style_traits: merged })
    .eq("id", user.id)
    .select("style_traits")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Could not update style profile." }, { status: 500 });
  }

  return NextResponse.json({ style_traits: updated.style_traits, added: learnedTraits });
}
