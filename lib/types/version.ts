import type { EditPlan } from "@/lib/types/project";

export type VersionStatus = "pending" | "rendering" | "done" | "failed";

export type Version = {
  id: string;
  project_id: string;
  user_id: string;
  version_number: number;
  render_job_id: string | null;
  status: VersionStatus;
  output_url: string | null;
  resolution: string | null;
  pinned: boolean;
  expires_at: string | null;
  plan_snapshot: EditPlan | null;
  created_at: string;
};

export function parseVersion(row: Record<string, unknown>): Version | null {
  if (typeof row.id !== "string" || typeof row.version_number !== "number") {
    return null;
  }

  const status = row.status;
  if (
    status !== "pending" &&
    status !== "rendering" &&
    status !== "done" &&
    status !== "failed"
  ) {
    return null;
  }

  return {
    id: row.id,
    project_id: String(row.project_id),
    user_id: String(row.user_id),
    version_number: row.version_number,
    render_job_id: typeof row.render_job_id === "string" ? row.render_job_id : null,
    status,
    output_url: typeof row.output_url === "string" ? row.output_url : null,
    resolution: typeof row.resolution === "string" ? row.resolution : null,
    pinned: Boolean(row.pinned),
    expires_at: typeof row.expires_at === "string" ? row.expires_at : null,
    plan_snapshot:
      row.plan_snapshot && typeof row.plan_snapshot === "object"
        ? (row.plan_snapshot as EditPlan)
        : null,
    created_at: String(row.created_at),
  };
}
