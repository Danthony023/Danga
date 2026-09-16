import { requireUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { user, supabase } = auth;

  let body: { style_traits?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.style_traits)) {
    return NextResponse.json(
      { error: "style_traits must be an array of strings." },
      { status: 400 }
    );
  }

  const styleTraits = body.style_traits
    .filter((trait): trait is string => typeof trait === "string")
    .map((trait) => trait.trim())
    .filter(Boolean);

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ style_traits: styleTraits })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
  }

  return NextResponse.json(profile);
}
