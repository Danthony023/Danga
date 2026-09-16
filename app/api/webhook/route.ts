import { mapCreatomateStatus } from "@/lib/creatomate";
import type { CreatomateRender } from "@/lib/creatomate/types";
import { verifyCreatomateWebhook } from "@/lib/creatomate/webhook";
import { updateVersionFromCreatomate } from "@/lib/render/versions";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase service role is not configured.");
  }
  return createClient(url, serviceKey);
}

function parseMetadata(metadata: string | null | undefined) {
  if (!metadata) {
    return null;
  }
  try {
    const parsed = JSON.parse(metadata) as { version_id?: string; project_id?: string };
    if (typeof parsed.version_id === "string") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyCreatomateWebhook(request, rawBody)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: CreatomateRender;
  try {
    payload = JSON.parse(rawBody) as CreatomateRender;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const metadata = parseMetadata(payload.metadata);
  if (!metadata?.version_id) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const mappedStatus = mapCreatomateStatus(payload.status);
  if (mappedStatus === "rendering") {
    return NextResponse.json({ ok: true, status: "rendering" });
  }

  const supabase = getServiceClient();

  const { data: version } = await supabase
    .from("versions")
    .select("*")
    .eq("id", metadata.version_id)
    .maybeSingle();

  if (!version) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (version.status === "done" || version.status === "failed") {
    return NextResponse.json({ ok: true, already_terminal: true });
  }

  await updateVersionFromCreatomate(
    supabase,
    version.id,
    version.user_id,
    mappedStatus,
    payload.url
  );

  if (mappedStatus === "done" && metadata.project_id) {
    await supabase
      .from("projects")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", metadata.project_id)
      .eq("user_id", version.user_id);
  }

  return NextResponse.json({ ok: true, status: mappedStatus });
}
