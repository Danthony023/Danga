"use client";

import { inferAssetType } from "@/lib/assets/validation";
import type { Asset } from "@/lib/types/database";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AssetCard, AssetFilterTabs } from "./AssetCard";

interface AssetGridProps {
  initialAssets: Asset[];
  onAssetsChange: (assets: Asset[]) => void;
}

export function AssetGrid({ initialAssets, onAssetsChange }: AssetGridProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [filter, setFilter] = useState<"all" | "video" | "audio" | "image">("all");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = useMemo(() => {
    if (filter === "all") {
      return assets;
    }
    return assets.filter((asset) => asset.type === filter);
  }, [assets, filter]);

  function updateAssets(next: Asset[]) {
    setAssets(next);
    onAssetsChange(next);
  }

  async function handleUpload(file: File) {
    const type = inferAssetType(file.name);
    if (!type) {
      setError("Unsupported file type. Use mp4/mov, mp3/wav/m4a, or jpg/png/webp.");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();
    setUploading(false);

    if (!response.ok) {
      setError(typeof payload.error === "string" ? payload.error : "Upload failed.");
      return;
    }

    updateAssets([payload as Asset, ...assets]);
  }

  async function handlePinToggle(asset: Asset) {
    setBusyId(asset.id);
    setError(null);

    const response = await fetch(`/api/assets/${asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !asset.pinned }),
    });

    const payload = await response.json();
    setBusyId(null);

    if (!response.ok) {
      setError(typeof payload.error === "string" ? payload.error : "Could not update pin.");
      return;
    }

    updateAssets(assets.map((row) => (row.id === asset.id ? (payload as Asset) : row)));
  }

  async function handleDelete(asset: Asset) {
    if (asset.pinned) {
      return;
    }

    if (!window.confirm(`Delete "${asset.name}"? This cannot be undone.`)) {
      return;
    }

    setBusyId(asset.id);
    setError(null);

    const response = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    setBusyId(null);

    if (!response.ok) {
      setError(typeof payload.error === "string" ? payload.error : "Could not delete asset.");
      return;
    }

    updateAssets(assets.filter((row) => row.id !== asset.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AssetFilterTabs value={filter} onChange={setFilter} />
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".mp4,.mov,.mp3,.wav,.m4a,.jpg,.jpeg,.png,.webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleUpload(file);
              }
              event.target.value = "";
            }}
          />
          <Button
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {filteredAssets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            No assets yet. Upload clips, audio, or images to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              busy={busyId === asset.id}
              onPinToggle={handlePinToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
