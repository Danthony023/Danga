type Caption = {
  text: string;
  start: number;
  end: number;
};

function formatSrtTime(seconds: number) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function generateSrt(captions: Caption[]) {
  if (captions.length === 0) {
    return "";
  }

  return captions
    .sort((a, b) => a.start - b.start)
    .map((caption, index) => {
      return [
        String(index + 1),
        `${formatSrtTime(caption.start)} --> ${formatSrtTime(caption.end)}`,
        caption.text.trim(),
        "",
      ].join("\n");
    })
    .join("\n");
}

export function extractCaptionsFromPlan(plan: unknown): Caption[] {
  if (!plan || typeof plan !== "object") {
    return [];
  }

  const captions = (plan as { captions?: unknown }).captions;
  if (!Array.isArray(captions)) {
    return [];
  }

  const parsed: Caption[] = [];
  for (const item of captions) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (
      typeof row.text !== "string" ||
      typeof row.start !== "number" ||
      typeof row.end !== "number"
    ) {
      continue;
    }
    parsed.push({ text: row.text, start: row.start, end: row.end });
  }

  return parsed;
}

export function estimateDurationFromPlan(plan: unknown, fallback = 0) {
  const captions = extractCaptionsFromPlan(plan);
  const captionEnd = captions.reduce((max, caption) => Math.max(max, caption.end), 0);

  if (!plan || typeof plan !== "object") {
    return captionEnd || fallback;
  }

  const clips = (plan as { clips?: Array<{ end?: number }> }).clips;
  const clipEnd = Array.isArray(clips)
    ? clips.reduce((max, clip) => Math.max(max, Number(clip.end ?? 0)), 0)
    : 0;

  return Math.max(captionEnd, clipEnd, fallback);
}
