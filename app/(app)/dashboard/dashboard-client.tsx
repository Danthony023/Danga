"use client";

import { AssetGrid } from "@/components/library/AssetGrid";
import { StorageMeter } from "@/components/library/StorageMeter";
import { StyleChips } from "@/components/library/StyleChips";
import { getStorageLimitBytes } from "@/lib/storage/usage";
import type { Asset } from "@/lib/types/database";
import { useMemo, useState } from "react";

interface DashboardClientProps {
  initialAssets: Asset[];
  styleTraits: string[];
  plan: string;
}

export function DashboardClient({
  initialAssets,
  styleTraits,
  plan,
}: DashboardClientProps) {
  const [assets, setAssets] = useState(initialAssets);
  const usedBytes = useMemo(
    () => assets.reduce((sum, asset) => sum + Number(asset.size_bytes), 0),
    [assets]
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Asset library</h1>
        <p className="text-sm text-zinc-500">
          Upload clips, audio, and images. Pin keepers and shape your style profile.
        </p>
      </div>

      <StorageMeter usedBytes={usedBytes} limitBytes={getStorageLimitBytes(plan)} />

      <StyleChips initialTraits={styleTraits} />

      <AssetGrid initialAssets={assets} onAssetsChange={setAssets} />
    </div>
  );
}
