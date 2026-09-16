import { analyseImageWithAI } from "@/lib/ai";
import { parseStyleTraitsFromAI } from "@/lib/onboarding/parse-traits";
import { requireUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";

const STYLE_PROMPT = `Analyze this frame from a creator's past short-form video.
Return ONLY a JSON array of 3-6 short style trait strings describing:
- caption look
- colour mood
- pacing impression

Example: ["Bold white captions", "Warm golden tones", "Fast-paced energy"]`;

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  let body: { imageBase64?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.imageBase64 || typeof body.imageBase64 !== "string") {
    return NextResponse.json({ error: "imageBase64 is required." }, { status: 400 });
  }

  try {
    const raw = await analyseImageWithAI(body.imageBase64, STYLE_PROMPT);
    const traits = parseStyleTraitsFromAI(raw);

    if (traits.length === 0) {
      return NextResponse.json(
        { error: "Could not detect style traits. Try a different clip." },
        { status: 422 }
      );
    }

    return NextResponse.json({ traits });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Style analysis failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
