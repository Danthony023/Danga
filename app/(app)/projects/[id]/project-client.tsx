"use client";

import { type UsageSummary } from "@/components/chat/PlanCard";
import { NotesPanel } from "@/components/project/NotesPanel";
import { RefineChat } from "@/components/review/RefineChat";
import { ReviewPanel } from "@/components/review/ReviewPanel";
import type { ChatMessage, EditPlan } from "@/lib/types/project";
import { parseVersion, type Version } from "@/lib/types/version";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ProjectClientProps {
  projectId: string;
  initialMessages: ChatMessage[];
  initialUsage: UsageSummary;
  initialVersions: Version[];
  initialNotes: string;
}

type ActivePlan = {
  plan: EditPlan;
  usage: UsageSummary;
};

function sortVersions(versions: Version[]) {
  return [...versions].sort((a, b) => a.version_number - b.version_number);
}

export function ProjectClient({
  projectId,
  initialMessages,
  initialUsage,
  initialVersions,
  initialNotes,
}: ProjectClientProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [notes, setNotes] = useState(initialNotes);
  const [usage, setUsage] = useState(initialUsage);
  const [versions, setVersions] = useState(() => sortVersions(initialVersions));
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    initialVersions.length > 0
      ? sortVersions(initialVersions)[initialVersions.length - 1]?.id ?? null
      : null
  );
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const currentVersionId = useMemo(() => {
    if (versions.length === 0) {
      return null;
    }
    return versions[versions.length - 1]?.id ?? null;
  }, [versions]);

  const selectedVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersionId) ?? null,
    [versions, selectedVersionId]
  );

  const renderingVersions = useMemo(
    () => versions.filter((version) => version.status === "rendering" && version.render_job_id),
    [versions]
  );

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, activePlan, loading]);

  const pollRenderStatus = useCallback(async (renderJobId: string, versionId: string) => {
    const response = await fetch(
      `/api/render/status/${renderJobId}?version_id=${versionId}`
    );
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return;
    }

    setVersions((current) =>
      sortVersions(
        current.map((version) =>
          version.id === versionId
            ? {
                ...version,
                status: payload.status as Version["status"],
                output_url:
                  typeof payload.output_url === "string"
                    ? payload.output_url
                    : version.output_url,
              }
            : version
        )
      )
    );

    if (payload.status === "done" || payload.status === "failed") {
      setRendering(false);
      if (payload.status === "failed") {
        setError(
          typeof payload.error_message === "string"
            ? payload.error_message
            : "Render failed. Try adjusting the plan and rendering again."
        );
      }
    }
  }, []);

  useEffect(() => {
    if (renderingVersions.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      for (const version of renderingVersions) {
        if (version.render_job_id) {
          void pollRenderStatus(version.render_job_id, version.id);
        }
      }
    }, 4000);

    for (const version of renderingVersions) {
      if (version.render_job_id) {
        void pollRenderStatus(version.render_job_id, version.id);
      }
    }

    return () => clearInterval(interval);
  }, [renderingVersions, pollRenderStatus]);

  async function handleSend(message: string) {
    setLoading(true);
    setError(null);
    setActivePlan(null);

    setMessages((current) => [...current, { role: "user", content: message }]);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, message }),
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(typeof payload.error === "string" ? payload.error : "Chat failed.");
      setMessages((current) => current.slice(0, -1));
      return;
    }

    if (payload.usage) {
      setUsage(payload.usage as UsageSummary);
    }

    if (payload.type === "plan" && payload.plan) {
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: payload.text,
        plan: payload.plan,
      };
      setMessages((current) => [...current, assistantMessage]);
      setActivePlan({
        plan: payload.plan as EditPlan,
        usage: payload.usage as UsageSummary,
      });
      if (typeof payload.notes === "string") {
        setNotes(payload.notes);
      }
      return;
    }

    setMessages((current) => [
      ...current,
      { role: "assistant", content: payload.text as string },
    ]);
  }

  async function handleRender() {
    if (!activePlan) {
      return;
    }

    setRendering(true);
    setError(null);

    const response = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setRendering(false);
      setError(typeof payload.error === "string" ? payload.error : "Render failed.");
      return;
    }

    const newVersion: Version = {
      id: payload.version_id as string,
      project_id: projectId,
      user_id: "",
      version_number: payload.version_number as number,
      render_job_id: payload.render_job_id as string,
      status: "rendering",
      output_url: null,
      resolution: null,
      pinned: false,
      expires_at: null,
      plan_snapshot: activePlan.plan,
      created_at: new Date().toISOString(),
    };

    setVersions((current) => sortVersions([...current, newVersion]));
    setSelectedVersionId(newVersion.id);
    setActivePlan(null);

    const usageResponse = await fetch("/api/usage");
    const usagePayload = await usageResponse.json().catch(() => ({}));
    if (usageResponse.ok) {
      setUsage(usagePayload as UsageSummary);
    }
  }

  async function handlePinToggle(version: Version) {
    setBusyVersionId(version.id);
    setError(null);

    const response = await fetch(`/api/versions/${version.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !version.pinned }),
    });

    const payload = await response.json().catch(() => ({}));
    setBusyVersionId(null);

    if (!response.ok) {
      setError(typeof payload.error === "string" ? payload.error : "Could not update pin.");
      return;
    }

    const updated = parseVersion(payload as Record<string, unknown>);
    if (updated) {
      setVersions((current) =>
        sortVersions(current.map((row) => (row.id === updated.id ? updated : row)))
      );
    }
  }

  async function handleRevert(version: Version) {
    setBusyVersionId(version.id);
    setError(null);

    const response = await fetch(`/api/versions/${version.id}/revert`, {
      method: "POST",
    });

    const payload = await response.json().catch(() => ({}));
    setBusyVersionId(null);

    if (!response.ok) {
      setError(typeof payload.error === "string" ? payload.error : "Could not revert plan.");
      return;
    }

    const plan = payload.project?.edit_plan as EditPlan | undefined;
    if (plan?.plan_items) {
      setActivePlan({ plan, usage });
    }
  }

  async function handleRetry(version: Version) {
    setBusyVersionId(version.id);
    setError(null);

    const revertResponse = await fetch(`/api/versions/${version.id}/revert`, {
      method: "POST",
    });
    const revertPayload = await revertResponse.json().catch(() => ({}));

    if (!revertResponse.ok) {
      setBusyVersionId(null);
      setError(
        typeof revertPayload.error === "string"
          ? revertPayload.error
          : "Could not restore plan for retry."
      );
      return;
    }

    setBusyVersionId(null);
    setRendering(true);

    const renderResponse = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });
    const renderPayload = await renderResponse.json().catch(() => ({}));

    if (!renderResponse.ok) {
      setRendering(false);
      setError(typeof renderPayload.error === "string" ? renderPayload.error : "Retry failed.");
      return;
    }

    const newVersion: Version = {
      id: renderPayload.version_id as string,
      project_id: projectId,
      user_id: "",
      version_number: renderPayload.version_number as number,
      render_job_id: renderPayload.render_job_id as string,
      status: "rendering",
      output_url: null,
      resolution: null,
      pinned: false,
      expires_at: null,
      plan_snapshot: (revertPayload.project?.edit_plan as EditPlan | undefined) ?? null,
      created_at: new Date().toISOString(),
    };

    setVersions((current) => sortVersions([...current, newVersion]));
    setSelectedVersionId(newVersion.id);

    const usageResponse = await fetch("/api/usage");
    const usagePayload = await usageResponse.json().catch(() => ({}));
    if (usageResponse.ok) {
      setUsage(usagePayload as UsageSummary);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Project</h1>
        <p className="text-sm text-zinc-500">
          Review renders above, then refine your edit in chat.
        </p>
      </div>

      <ReviewPanel
        versions={versions}
        selectedVersion={selectedVersion}
        currentVersionId={currentVersionId}
        busyVersionId={busyVersionId}
        onSelectVersion={(version) => setSelectedVersionId(version.id)}
        onPinToggle={(version) => void handlePinToggle(version)}
        onRevert={(version) => void handleRevert(version)}
        onRetry={(version) => void handleRetry(version)}
      />

      <NotesPanel projectId={projectId} notes={notes} onNotesChange={setNotes} />

      <RefineChat
        messages={messages}
        activePlan={activePlan}
        loading={loading}
        rendering={rendering}
        error={error}
        threadRef={threadRef}
        onSend={handleSend}
        onAdjustPlan={() => setActivePlan(null)}
        onRender={() => void handleRender()}
        header={
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Refine</h2>
            <p className="text-sm text-zinc-500">
              Chat to adjust the plan and create a new version.
            </p>
          </div>
        }
      />
    </div>
  );
}
