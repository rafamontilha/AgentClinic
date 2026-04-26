// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => cleanup());

// Dashboard page now imports DB — mock all dependencies so the component renders without I/O
vi.mock("@/src/db/client", () => ({ getDb: vi.fn() }));
vi.mock("@/src/db/repositories/analytics", () => ({
  getOverview: vi.fn(() => ({ total_patients: 0, active_visits: 0, resolved_today: 0, referrals_pending: 0 })),
  getAilmentAnalytics: vi.fn(() => []),
  getTreatmentAnalytics: vi.fn(() => []),
}));
vi.mock("@/src/db/repositories/visits", () => ({ listVisits: vi.fn(() => []) }));
vi.mock("@/app/components/SseRefresh", () => ({ SseRefresh: () => null }));
vi.mock("@/app/components/charts/AilmentBarChart", () => ({ AilmentBarChart: () => null }));
vi.mock("@/app/components/charts/SeverityDonut", () => ({ SeverityDonut: () => null }));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    role,
  }: {
    href: string;
    children: React.ReactNode;
    role?: string;
  }) => (
    <a href={href} role={role}>
      {children}
    </a>
  ),
}));

import HomePage from "@/app/page";
import DashboardPage from "@/app/dashboard/page";

// ── Home page — structure and content ───────────────────────────────────────

describe("HomePage — structure and content", () => {
  it("renders a hero heading", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("h1")).toBeInTheDocument();
  });

  it("hero heading mentions the clinic concept", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("h1")?.textContent).toContain("clinic");
  });

  it("CTA link points to /dashboard", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("a[href='/dashboard']")).toBeInTheDocument();
  });

  it("renders three feature articles", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelectorAll("article")).toHaveLength(3);
  });

  it("features include Register, Diagnose, and Prescribe", () => {
    const { container } = render(<HomePage />);
    const headings = Array.from(container.querySelectorAll("h2")).map(
      (h) => h.textContent
    );
    expect(headings).toContain("Register");
    expect(headings).toContain("Diagnose");
    expect(headings).toContain("Prescribe");
  });

  it("renders two sections", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelectorAll("section").length).toBeGreaterThanOrEqual(2);
  });

  it("renders a footer", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("footer")).toBeInTheDocument();
  });

  it("footer contains the brand name", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("footer")?.textContent).toContain("AgentClinic");
  });
});

// ── Dashboard page — basic structure ────────────────────────────────────────

describe("DashboardPage — basic structure", () => {
  it("renders a heading", () => {
    const { container } = render(<DashboardPage />);
    expect(container.querySelector("h1")).toBeInTheDocument();
  });

  it("heading text is Dashboard", () => {
    const { container } = render(<DashboardPage />);
    expect(container.querySelector("h1")?.textContent).toBe("Dashboard");
  });

  it("renders page content", () => {
    const { container } = render(<DashboardPage />);
    expect(container.textContent?.length).toBeGreaterThan(0);
  });
});
