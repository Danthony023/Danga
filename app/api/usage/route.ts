import { requireUser } from "@/lib/auth/session";
import { getUsageSummary } from "@/lib/usage";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { user, supabase } = auth;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 400 });
  }

  try {
    const summary = await getUsageSummary(supabase, user.id, profile.plan);
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 });
  }
}
