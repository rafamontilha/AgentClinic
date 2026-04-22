import { describe, expect, it, vi } from "vitest";
import { eventBus } from "@/src/lib/event-bus";

describe("eventBus singleton — subscribe / emit / unsubscribe", () => {
  it("delivers emitted events to a subscriber", () => {
    const fn = vi.fn();
    const unsub = eventBus.subscribe(fn);
    eventBus.emit("visit_created", { visit_id: "abc" });
    unsub();
    expect(fn).toHaveBeenCalledWith({ type: "visit_created", data: { visit_id: "abc" } });
  });

  it("delivers to multiple subscribers", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const u1 = eventBus.subscribe(fn1);
    const u2 = eventBus.subscribe(fn2);
    eventBus.emit("referral_created", {});
    u1();
    u2();
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it("unsubscribe stops further delivery", () => {
    const fn = vi.fn();
    const unsub = eventBus.subscribe(fn);
    eventBus.emit("visit_resolved", {});
    unsub();
    eventBus.emit("visit_resolved", {});
    expect(fn).toHaveBeenCalledOnce();
  });

  it("emitting with no subscribers does not throw", () => {
    expect(() => eventBus.emit("chronic_flagged", {})).not.toThrow();
  });

  it("has subscribe and emit methods", () => {
    expect(typeof eventBus.subscribe).toBe("function");
    expect(typeof eventBus.emit).toBe("function");
  });
});
