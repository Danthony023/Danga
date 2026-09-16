import { extractAssetIdsFromPlan } from "@/lib/export/plan-assets";
import { requireUser } from "@/lib/auth/session";
import { ZipArchive } from "archiver";
import { PassThrough } from "stream";
import { NextResponse } from "next/server";

export async function GET(
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
  const assetIds = extractAssetIdsFromPlan(plan);

  if (assetIds.length === 0) {
    return NextResponse.json({ error: "No source assets found for this version." }, { status: 404 });
  }

  const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select("id, name, storage_path")
    .eq("user_id", user.id)
    .in("id", assetIds);

  if (assetsError || !assets || assets.length === 0) {
    return NextResponse.json({ error: "Could not load source assets." }, { status: 404 });
  }

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.pipe(stream);

  for (const asset of assets) {
    const { data, error } = await supabase.storage.from("assets").download(asset.storage_path);
    if (error || !data) {
      continue;
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    archive.append(buffer, { name: asset.name });
  }

  const chunks: Buffer[] = [];
  stream.on("data", (chunk) => {
    chunks.push(Buffer.from(chunk));
  });

  await new Promise<void>((resolve, reject) => {
    stream.on("end", () => resolve());
    stream.on("error", reject);
    void archive.finalize();
  });

  if (chunks.length === 0) {
    return NextResponse.json({ error: "Could not build components archive." }, { status: 500 });
  }

  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="danga-v${version.version_number}-components.zip"`,
    },
  });
}
