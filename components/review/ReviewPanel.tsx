"use client";

import { VideoPlayer } from "@/components/review/VideoPlayer";
import { VersionChips } from "@/components/review/VersionChips";
import type { Version } from "@/lib/types/version";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ReviewPanelProps {
  versions: Version[];
  selectedVersion: Version | null;
  currentVersionId: string | null;
  busyVersionId?: string | null;
  onSelectVersion: (version: Version) => void;
  onPinToggle: (version: Version) => void;
  onRevert: (version: Version) => void;
  onRetry: (version: Version) => void;
}

export function ReviewPanel({
  versions,
  selectedVersion,
  currentVersionId,
  busyVersionId,
  onSelectVersion,
  onPinToggle,
  onRevert,
  onRetry,
}: ReviewPanelProps) {
  if (versions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700">
        Render a plan to preview your video here.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Review</h2>
        <p className="text-sm text-zinc-500">Compare versions and refine in chat below.</p>
      </div>

      <VersionChips
        versions={versions}
        selectedId={selectedVersion?.id ?? null}
        currentId={currentVersionId}
        busyId={busyVersionId}
        onSelect={onSelectVersion}
        onPinToggle={onPinToggle}
        onRevert={onRevert}
      />

      {selectedVersion?.status === "rendering" ? (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          <div>
            <p className="text-sm font-medium">Rendering v{selectedVersion.version_number}…</p>
            <p className="text-xs text-zinc-500">This usually takes under a minute.</p>
          </div>
        </div>
      ) : null}

      {selectedVersion?.status === "done" && selectedVersion.output_url ? (
        <div className="space-y-3">
          <VideoPlayer
            outputUrl={selectedVersion.output_url}
            label={`Version ${selectedVersion.version_number}`}
          />
          <Link href={`/export/${selectedVersion.id}`}>
            <Button variant="secondary">Export v{selectedVersion.version_number}</Button>
          </Link>
        </div>
      ) : null}

      {selectedVersion?.status === "failed" ? (
        <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
          <p className="text-sm text-red-700 dark:text-red-200">
            v{selectedVersion.version_number} failed to render.
          </p>
          <Button variant="secondary" onClick={() => onRetry(selectedVersion)}>
            Retry render
          </Button>
        </div>
      ) : null}

      {selectedVersion?.status === "pending" ? (
        <p className="text-sm text-zinc-500">This version is queued.</p>
      ) : null}
    </div>
  );
}
