export type RenderResolution = "720p" | "1080p" | "4k";

export type EditPlan = {
  clips: Array<{ asset_id: string; start: number; end: number }>;
  captions: Array<{ text: string; start: number; end: number; style: string }>;
  audio: { asset_id: string; volume: number } | null;
  resolution: RenderResolution;
};

export type CreatomateRenderStatus =
  | "planned"
  | "waiting"
  | "transcribing"
  | "rendering"
  | "succeeded"
  | "failed";

export type CreatomateRender = {
  id: string;
  status: CreatomateRenderStatus;
  url?: string | null;
  error_message?: string | null;
  metadata?: string | null;
};

export const RESOLUTION_DIMENSIONS: Record<
  RenderResolution,
  { width: number; height: number }
> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4k": { width: 3840, height: 2160 },
};
