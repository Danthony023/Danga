import { createHmac, timingSafeEqual } from "crypto";

export function verifyCreatomateWebhook(request: Request, rawBody: string): boolean {
  const secret = process.env.CREATOMATE_WEBHOOK_SECRET?.trim();
  if (!secret || secret === "...") {
    // Not configured yet — allowed locally until Vercel deployment (per build spec).
    return true;
  }

  const signature =
    request.headers.get("x-creatomate-signature") ??
    request.headers.get("x-webhook-signature");

  if (signature) {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const normalized = signature.replace(/^sha256=/, "");
    try {
      return timingSafeEqual(Buffer.from(normalized), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  const authorization = request.headers.get("authorization");
  if (authorization === `Bearer ${secret}`) {
    return true;
  }

  return false;
}
