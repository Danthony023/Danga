"use client";

import { formatBytes, formatDuration } from "@/lib/assets/validation";
import type { Asset } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AssetCardProps {
  asset: Asset;
  onPinToggle: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  busy?: boolean;
}

function TypeIcon({ type }: { type: Asset["type"] }) {
  const label =
    type === "video" ? "Clip" : type === "audio" ? "Audio" : "Image";

  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {label.slice(0, 1)}
    </span>
  );
}

export function AssetCard({ asset, onPinToggle, onDelete, busy }: AssetCardProps) {
  const subtitle =
    asset.type === "image"
      ? asset.name.split(".").pop()?.toUpperCase() ?? "Image"
      : formatDuration(asset.duration_seconds) ?? "—";

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <TypeIcon type={asset.type} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={asset.name}>
              {asset.name}
            </p>
            <p className="text-xs text-zinc-500">
              {subtitle} · {formatBytes(asset.size_bytes)}
            </p>
          </div>
        </div>
        {asset.pinned ? (
          <span
            className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200"
            title="Pinned"
          >
            Pinned
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex gap-2">
        <Button
          variant="secondary"
          className="flex-1 text-xs"
          disabled={busy}
          onClick={() => onPinToggle(asset)}
        >
          {asset.pinned ? "Unpin" : "Pin"}
        </Button>
        <Button
          variant="danger"
          className="flex-1 text-xs"
          disabled={busy || asset.pinned}
          onClick={() => onDelete(asset)}
          title={asset.pinned ? "Unpin before deleting" : "Delete asset"}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

export function AssetFilterTabs({
  value,
  onChange,
}: {
  value: "all" | "video" | "audio" | "image";
  onChange: (value: "all" | "video" | "audio" | "image") => void;
}) {
  const tabs = [
    { id: "all" as const, label: "All" },
    { id: "video" as const, label: "Clips" },
    { id: "audio" as const, label: "Audio" },
    { id: "image" as const, label: "Images" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition",
            value === tab.id
              ? "bg-violet-600 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
