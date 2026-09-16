import type { AssetType } from "@/lib/types/database";

const MB = 1024 * 1024;

type AssetRules = {
  extensions: string[];
  mimeTypes: string[];
  maxBytes: number;
};

const ASSET_RULES: Record<AssetType, AssetRules> = {
  video: {
    extensions: [".mp4", ".mov"],
    mimeTypes: ["video/mp4", "video/quicktime"],
    maxBytes: 300 * MB,
  },
  audio: {
    extensions: [".mp3", ".wav", ".m4a"],
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a"],
    maxBytes: 50 * MB,
  },
  image: {
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 20 * MB,
  },
};

function getExtension(filename: string) {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function inferAssetType(filename: string): AssetType | null {
  const ext = getExtension(filename);
  for (const [type, rules] of Object.entries(ASSET_RULES) as [AssetType, AssetRules][]) {
    if (rules.extensions.includes(ext)) {
      return type;
    }
  }
  return null;
}

export function validateAssetFile(
  file: File,
  declaredType: AssetType
): { ok: true } | { ok: false; message: string } {
  const rules = ASSET_RULES[declaredType];
  const ext = getExtension(file.name);

  if (!rules.extensions.includes(ext)) {
    return {
      ok: false,
      message: `Invalid file type for ${declaredType}. Allowed: ${rules.extensions.join(", ")}`,
    };
  }

  if (file.type && !rules.mimeTypes.includes(file.type)) {
    return {
      ok: false,
      message: `Invalid MIME type for ${declaredType}.`,
    };
  }

  if (file.size > rules.maxBytes) {
    const maxMb = Math.round(rules.maxBytes / MB);
    return {
      ok: false,
      message: `File is too large. Maximum size for ${declaredType} is ${maxMb}MB.`,
    };
  }

  const inferred = inferAssetType(file.name);
  if (inferred !== declaredType) {
    return {
      ok: false,
      message: "File extension does not match the declared asset type.",
    };
  }

  return { ok: true };
}

export function formatBytes(bytes: number) {
  if (bytes < MB) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / MB).toFixed(1)} MB`;
}

export function formatDuration(seconds: number | null) {
  if (seconds == null) {
    return null;
  }
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
