import type { CreatomateRender } from "@/lib/creatomate/types";

const CREATOMATE_API_BASE = "https://api.creatomate.com/v2";

function getApiKey() {
  const apiKey = process.env.CREATOMATE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CREATOMATE_API_KEY is not configured.");
  }
  return apiKey;
}

export async function submitCreatomateRender(
  source: object,
  options?: { webhookUrl?: string; metadata?: string }
): Promise<CreatomateRender> {
  const apiKey = getApiKey();

  const body: Record<string, unknown> = { ...source };
  if (options?.webhookUrl) {
    body.webhook_url = options.webhookUrl;
  }
  if (options?.metadata) {
    body.metadata = options.metadata;
  }

  const response = await fetch(`${CREATOMATE_API_BASE}/renders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error("Creatomate rejected the render request.");
  }

  const render = Array.isArray(payload) ? payload[0] : payload;
  if (!render || typeof render.id !== "string") {
    throw new Error("Creatomate returned an unexpected response.");
  }

  return render as CreatomateRender;
}

export async function getCreatomateRender(jobId: string): Promise<CreatomateRender> {
  const apiKey = getApiKey();

  const response = await fetch(`${CREATOMATE_API_BASE}/renders/${jobId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload || typeof payload.id !== "string") {
    throw new Error("Could not fetch render status from Creatomate.");
  }

  return payload as CreatomateRender;
}

export function mapCreatomateStatus(
  status: CreatomateRender["status"]
): "rendering" | "done" | "failed" {
  if (status === "succeeded") {
    return "done";
  }
  if (status === "failed") {
    return "failed";
  }
  return "rendering";
}
