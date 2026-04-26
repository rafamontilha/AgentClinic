import crypto from "crypto";
import { getDb } from "@/src/db/client";
import { eventBus } from "@/src/lib/event-bus";
import type { EventName } from "@/src/lib/event-bus";

export const RETRY_DELAYS_MS = [1000, 2000, 4000];

function computeSignature(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function deliverToEndpoint(
  endpointId: string,
  url: string,
  secret: string,
  payload: string,
  eventName: EventName
): Promise<void> {
  const sig = computeSignature(payload, secret);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-AgentClinic-Signature": `sha256=${sig}`,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers, body: payload });
      console.log(`[webhook] ${endpointId} attempt ${attempt + 1}: HTTP ${res.status}`);
      if (res.ok) return;
      if (res.status >= 400 && res.status < 500) return;
    } catch {
      console.log(`[webhook] ${endpointId} attempt ${attempt + 1}: network error`);
    }
    if (attempt < 2) await sleep(RETRY_DELAYS_MS[attempt]);
  }
  console.error(
    `[webhook] endpoint ${endpointId} failed to deliver "${eventName}" after 3 attempts`
  );
}

export function initWebhookDelivery(): () => void {
  return eventBus.subscribe(({ type, data }) => {
    const db = getDb();
    const endpoints = db
      .prepare("SELECT id, url, secret, events FROM webhook_endpoints WHERE active = 1")
      .all() as Array<{ id: string; url: string; secret: string; events: string }>;

    const payload = JSON.stringify({ event: type, data });

    for (const ep of endpoints) {
      let events: string[];
      try {
        events = JSON.parse(ep.events) as string[];
      } catch {
        continue;
      }
      if (!events.includes(type)) continue;
      void deliverToEndpoint(ep.id, ep.url, ep.secret, payload, type);
    }
  });
}
