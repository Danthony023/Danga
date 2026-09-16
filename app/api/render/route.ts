import { requireUser } from "@/lib/auth/session";
import {
  convertAiPlanToRenderPlan,
  submitCreatomateRender,
  translateToCreatomate,
} from "@/lib/creatomate";
import { getPlanLimits } from "@/lib/plans";
import { resolveAssetSignedUrls } from "@/lib/render/assets";
import { getNextVersionNumber } from "@/lib/render/versions";
import type { EditPlan as AiEditPlan } from "@/lib/types/project";
import { assertRenderQuota, incrementRendersUsed } from "@/lib/usage";
import { NextResponse } from "next/server";

function isAiEditPlan(value: unknown): value is AiEditPlan {
  if (!value || typeof value !== "object") {
    return false;
  }
  const plan = value as AiEditPlan;
  return Array.isArray(plan.plan_items);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { user, supabase } = auth;

  let body: { project_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const projectId = body.project_id;
  if (!projectId) {
    return NextResponse.json({ error: "project_id is required." }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (!isAiEditPlan(project.edit_plan) || !project.edit_plan.render_ready) {
    return NextResponse.json(
      { error: "No render-ready edit plan found for this project." },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, style_traits")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 400 });
  }

  const quota = await assertRenderQuota(supabase, user.id, profile.plan);
  if (!quota.ok) {
    return NextResponse.json({ error: quota.message }, { status: 429 });
  }

  const styleTraits = Array.isArray(profile.style_traits)
    ? profile.style_traits.filter((trait: unknown): trait is string => typeof trait === "string")
    : [];

  const { data: assets } = await supabase
    .from("assets")
    .select("id, duration_seconds, type")
    .eq("user_id", user.id);

  let renderPlan;
  try {
    renderPlan = convertAiPlanToRenderPlan(
      project.edit_plan,
      getPlanLimits(profile.plan).resolution,
      assets ?? [],
      styleTraits
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid edit plan.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const assetIds = [
    ...renderPlan.clips.map((clip) => clip.asset_id),
    ...(renderPlan.audio ? [renderPlan.audio.asset_id] : []),
  ];

  let assetUrls: Record<string, string>;
  try {
    assetUrls = await resolveAssetSignedUrls(supabase, user.id, assetIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not resolve assets.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const assetTypes = Object.fromEntries((assets ?? []).map((asset) => [asset.id, asset.type]));
  const creatomateSource = translateToCreatomate(renderPlan, assetUrls, assetTypes);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const webhookSecret = process.env.CREATOMATE_WEBHOOK_SECRET?.trim();
  const webhookUrl =
    appUrl && webhookSecret && webhookSecret !== "..."
      ? `${appUrl}/api/webhook`
      : undefined;

  let versionNumber: number;
  try {
    versionNumber = await getNextVersionNumber(supabase, projectId, user.id);
  } catch {
    return NextResponse.json({ error: "Could not create version." }, { status: 500 });
  }

  const mergedEditPlan = {
    ...project.edit_plan,
    clips: renderPlan.clips,
    captions: renderPlan.captions,
    audio: renderPlan.audio,
    resolution: renderPlan.resolution,
  };

  const { data: version, error: versionInsertError } = await supabase
    .from("versions")
    .insert({
      project_id: projectId,
      user_id: user.id,
      version_number: versionNumber,
      status: "pending",
      resolution: renderPlan.resolution,
      plan_snapshot: mergedEditPlan,
    })
    .select("*")
    .single();

  if (versionInsertError || !version) {
    return NextResponse.json({ error: "Could not create version." }, { status: 500 });
  }

  let creatomateRender;
  try {
    creatomateRender = await submitCreatomateRender(creatomateSource, {
      webhookUrl,
      metadata: JSON.stringify({ version_id: version.id, project_id: projectId }),
    });
  } catch {
    await supabase.from("versions").delete().eq("id", version.id).eq("user_id", user.id);
    return NextResponse.json(
      { error: "Render submission failed. Please try again in a moment." },
      { status: 502 }
    );
  }

  await Promise.all([
    supabase
      .from("versions")
      .update({
        render_job_id: creatomateRender.id,
        status: "rendering",
      })
      .eq("id", version.id)
      .eq("user_id", user.id),
    supabase
      .from("projects")
      .update({
        status: "rendering",
        edit_plan: mergedEditPlan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("user_id", user.id),
  ]);

  try {
    await incrementRendersUsed(supabase, user.id);
  } catch {
    return NextResponse.json({ error: "Render started but usage was not recorded." }, { status: 500 });
  }

  return NextResponse.json({
    version_id: version.id,
    render_job_id: creatomateRender.id,
    status: "rendering",
    version_number: versionNumber,
  });
}
