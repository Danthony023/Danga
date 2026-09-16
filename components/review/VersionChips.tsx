"use client";

import type { Version } from "@/lib/types/version";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VersionChipsProps {
  versions: Version[];
  selectedId: string | null;
  currentId: string | null;
  busyId?: string | null;
  onSelect: (version: Version) => void;
  onPinToggle: (version: Version) => void;
  onRevert: (version: Version) => void;
}

export function VersionChips({
  versions,
  selectedId,
  currentId,
  busyId,
  onSelect,
  onPinToggle,
  onRevert,
}: VersionChipsProps) {
  if (versions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {versions.map((version) => {
          const isSelected = version.id === selectedId;
          const isCurrent = version.id === currentId;

          return (
            <button
              key={version.id}
              type="button"
              onClick={() => onSelect(version)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition",
                isSelected
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
                isCurrent && !isSelected && "ring-2 ring-violet-300 dark:ring-violet-700"
              )}
            >
              v{version.version_number}
              {version.pinned ? " · pinned" : ""}
              {version.status === "rendering" ? " …" : ""}
              {version.status === "failed" ? " !" : ""}
            </button>
          );
        })}
      </div>

      {selectedId ? (
        <div className="flex flex-wrap gap-2">
          {versions
            .filter((version) => version.id === selectedId)
            .map((version) => (
              <div key={version.id} className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="text-xs"
                  disabled={busyId === version.id}
                  onClick={() => onPinToggle(version)}
                >
                  {version.pinned ? "Unpin" : "Pin"}
                </Button>
                <Button
                  variant="secondary"
                  className="text-xs"
                  disabled={busyId === version.id || !version.plan_snapshot}
                  onClick={() => onRevert(version)}
                >
                  Revert to this plan
                </Button>
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}
