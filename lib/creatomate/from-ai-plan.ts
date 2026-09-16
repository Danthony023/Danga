import type { EditPlan as CreatomateEditPlan } from "@/lib/creatomate/types";
import type { EditPlan as AiEditPlan, PlanItem } from "@/lib/types/project";
import type { RenderResolution } from "@/lib/creatomate/types";

type AssetMeta = {
  id: string;
  duration_seconds: number | null;
};

function parseTimeRange(description: string): { start: number; end: number } | null {
  const rangeMatch = description.match(
    /(\d{1,2}:\d{2}(?::\d{2})?|\d+(?:\.\d+)?)\s*(?:-|to|–)\s*(\d{1,2}:\d{2}(?::\d{2})?|\d+(?:\.\d+)?)/i
  );
  if (!rangeMatch) {
    return null;
  }

  const toSeconds = (value: string) => {
    if (value.includes(":")) {
      const parts = value.split(":").map(Number);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      return parts[0] * 60 + parts[1];
    }
    return Number(value);
  };

  const start = toSeconds(rangeMatch[1]);
  const end = toSeconds(rangeMatch[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return { start, end };
}

function defaultClipDuration(asset: AssetMeta | undefined) {
  if (asset?.duration_seconds && asset.duration_seconds > 0) {
    return Math.min(Number(asset.duration_seconds), 15);
  }
  return 4;
}

function inferCaptionStyle(styleTraits: string[]) {
  const joined = styleTraits.join(" ").toLowerCase();
  if (joined.includes("bold") && joined.includes("white")) {
    return "bold-white";
  }
  if (joined.includes("caption")) {
    return joined.includes("bold") ? "bold-white" : "white";
  }
  return "bold-white";
}

export function convertAiPlanToRenderPlan(
  aiPlan: AiEditPlan,
  resolution: RenderResolution,
  assets: AssetMeta[],
  styleTraits: string[] = []
): CreatomateEditPlan {
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const clips: CreatomateEditPlan["clips"] = [];
  const captions: CreatomateEditPlan["captions"] = [];
  let audio: CreatomateEditPlan["audio"] = null;

  let timelineCursor = 0;

  const sortedItems = [...aiPlan.plan_items].sort((a, b) => a.step - b.step);

  for (const item of sortedItems) {
    applyPlanItem(item, {
      assetMap,
      clips,
      captions,
      styleTraits,
      getTimelineCursor: () => timelineCursor,
      setTimelineCursor: (value: number) => {
        timelineCursor = value;
      },
      setAudio: (value) => {
        audio = value;
      },
    });
  }

  if (clips.length === 0) {
    throw new Error("The edit plan has no clips to render. Add clip steps with asset IDs.");
  }

  return {
    clips,
    captions,
    audio,
    resolution,
  };
}

function applyPlanItem(
  item: PlanItem,
  ctx: {
    assetMap: Map<string, AssetMeta>;
    clips: CreatomateEditPlan["clips"];
    captions: CreatomateEditPlan["captions"];
    styleTraits: string[];
    getTimelineCursor: () => number;
    setTimelineCursor: (value: number) => void;
    setAudio: (value: CreatomateEditPlan["audio"]) => void;
  }
) {
  const parsedRange = parseTimeRange(item.description);
  const asset = item.asset_id ? ctx.assetMap.get(item.asset_id) : undefined;

  if (item.type === "clip" && item.asset_id) {
    const clipDuration = parsedRange
      ? parsedRange.end - parsedRange.start
      : defaultClipDuration(asset);
    const start = parsedRange?.start ?? ctx.getTimelineCursor();
    const end = parsedRange?.end ?? start + clipDuration;
    ctx.clips.push({
      asset_id: item.asset_id,
      start: 0,
      end: end - start,
    });
    ctx.setTimelineCursor(end);
    return;
  }

  if (item.type === "image" && item.asset_id) {
    const duration = parsedRange ? parsedRange.end - parsedRange.start : 3;
    const start = parsedRange?.start ?? ctx.getTimelineCursor();
    const end = parsedRange?.end ?? start + duration;
    ctx.clips.push({
      asset_id: item.asset_id,
      start: 0,
      end: end - start,
    });
    ctx.setTimelineCursor(end);
    return;
  }

  if (item.type === "caption") {
    const start = parsedRange?.start ?? Math.max(0, ctx.getTimelineCursor() - 4);
    const end = parsedRange?.end ?? start + 3;
    ctx.captions.push({
      text: item.description,
      start,
      end,
      style: inferCaptionStyle(ctx.styleTraits),
    });
    return;
  }

  if (item.type === "audio" && item.asset_id) {
    ctx.setAudio({ asset_id: item.asset_id, volume: 0.85 });
  }
}
