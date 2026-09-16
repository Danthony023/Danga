"use client";

import { VideoPlayer } from "@/components/review/VideoPlayer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";

interface ExportCardProps {
  versionId: string;
  versionNumber: number;
  outputUrl: string;
  resolution: string | null;
  durationSeconds: number;
  projectId: string;
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function ExportCard({
  versionId,
  versionNumber,
  outputUrl,
  resolution,
  durationSeconds,
  projectId,
}: ExportCardProps) {
  const [rememberStyle, setRememberStyle] = useState(true);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function handleExport() {
    setBusy("export");
    setMessage(null);

    if (rememberStyle) {
      await fetch(`/api/export/${versionId}/remember-style`, { method: "POST" });
    }

    setBusy(null);
    setMessage("Ready to download your files below.");
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(outputUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Could not copy link. Copy the video URL manually.");
    }
  }

  function downloadFile(url: string, filename: string) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href={`/projects/${projectId}`} className="text-sm text-violet-600 hover:underline">
          ← Back to project
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Export v{versionNumber}</h1>
        <p className="text-sm text-zinc-500">
          {resolution ?? "Unknown resolution"} · {formatDuration(durationSeconds)}
        </p>
      </div>

      <VideoPlayer outputUrl={outputUrl} />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={rememberStyle}
          onChange={(event) => setRememberStyle(event.target.checked)}
          className="rounded border-zinc-300"
        />
        Remember this style for next time
      </label>

      <div className="flex flex-wrap gap-2">
        <Button disabled={busy === "export"} onClick={() => void handleExport()}>
          {busy === "export" ? "Preparing…" : "Confirm export"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => downloadFile(outputUrl, `danga-v${versionNumber}.mp4`)}
        >
          Download video
        </Button>
        <Button
          variant="secondary"
          onClick={() => downloadFile(`/api/export/${versionId}/srt`, `danga-v${versionNumber}.srt`)}
        >
          Download SRT
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            downloadFile(
              `/api/export/${versionId}/components`,
              `danga-v${versionNumber}-components.zip`
            )
          }
        >
          Download components
        </Button>
        <Button variant="secondary" onClick={() => void copyShareLink()}>
          {copied ? "Copied!" : "Share link"}
        </Button>
      </div>

      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
