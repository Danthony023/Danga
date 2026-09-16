import { RESOLUTION_DIMENSIONS, type EditPlan } from "@/lib/creatomate/types";

type CreatomateElement = Record<string, unknown>;

function captionStyleToProps(style: string) {
  const normalized = style.toLowerCase();
  if (normalized.includes("bold") && normalized.includes("white")) {
    return {
      fill_color: "#ffffff",
      stroke_color: "#000000",
      stroke_width: "0.4 vmin",
      font_weight: "700",
    };
  }
  if (normalized.includes("yellow")) {
    return { fill_color: "#facc15", font_weight: "700" };
  }
  return { fill_color: "#ffffff", font_weight: "600" };
}

export function translateToCreatomate(
  plan: EditPlan,
  assetUrls: Record<string, string>,
  assetTypes: Record<string, string> = {}
): object {
  const { width, height } = RESOLUTION_DIMENSIONS[plan.resolution];
  const elements: CreatomateElement[] = [];

  let timeline = 0;
  for (const clip of plan.clips) {
    const source = assetUrls[clip.asset_id];
    if (!source) {
      continue;
    }
    const duration = Math.max(0.5, clip.end - clip.start);
    const mediaType = assetTypes[clip.asset_id] === "image" ? "image" : "video";
    const element: CreatomateElement = {
      type: mediaType,
      source,
      time: timeline,
      duration,
      width: "100%",
      height: "100%",
      fit: "cover",
    };
    if (mediaType === "video") {
      element.trim_start = clip.start;
      element.trim_duration = duration;
    }
    elements.push(element);
    timeline += duration;
  }

  for (const caption of plan.captions) {
    const duration = Math.max(0.5, caption.end - caption.start);
    elements.push({
      type: "text",
      text: caption.text,
      time: caption.start,
      duration,
      width: "88%",
      height: "20%",
      x: "50%",
      y: "85%",
      x_alignment: "50%",
      y_alignment: "50%",
      font_family: "Montserrat",
      font_size: "6 vmin",
      ...captionStyleToProps(caption.style),
    });
  }

  if (plan.audio) {
    const source = assetUrls[plan.audio.asset_id];
    if (source) {
      elements.push({
        type: "audio",
        source,
        volume: `${Math.round(plan.audio.volume * 100)}%`,
      });
    }
  }

  const clipDuration = plan.clips.reduce(
    (sum, clip) => sum + Math.max(0.5, clip.end - clip.start),
    0
  );
  const duration = Math.max(
    3,
    clipDuration,
    ...plan.captions.map((caption) => caption.end),
    0
  );

  return {
    output_format: "mp4",
    width,
    height,
    duration,
    frame_rate: 30,
    elements,
  };
}
