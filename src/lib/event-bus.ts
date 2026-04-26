export type EventName =
  | "visit_created"
  | "visit_resolved"
  | "referral_created"
  | "chronic_flagged";

export interface BusEvent {
  type: EventName;
  data: unknown;
}

type Subscriber = (event: BusEvent) => void;

class EventBusImpl {
  private subscribers = new Set<Subscriber>();

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  emit(type: EventName, data: unknown): void {
    const event: BusEvent = { type, data };
    for (const fn of this.subscribers) {
      fn(event);
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __eventBus: EventBusImpl | undefined;
}

// Singleton that survives Next.js hot-reload in dev
export const eventBus: EventBusImpl =
  globalThis.__eventBus ?? (globalThis.__eventBus = new EventBusImpl());
