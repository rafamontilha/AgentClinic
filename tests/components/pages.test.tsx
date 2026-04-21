// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => cleanup());

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import HomePage from "@/app/page";
import DashboardPage from "@/app/dashboard/page";

// ── Home page ────────────────────────────────────────────────────────────────

describe("HomePage — responsive layout classes", () => {
  it("hero section has mobile base padding (py-16)", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("section")?.className).toContain("py-16");
  });

  it("hero section has expanded desktop padding (md:py-28)", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("section")?.className).toContain("md:py-28");
  });

  it("hero heading has mobile base font size (text-3xl)", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("h1")?.className).toContain("text-3xl");
  });

  it("hero heading scales up at sm breakpoint (sm:text-4xl)", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("h1")?.className).toContain("sm:text-4xl");
  });

  it("hero heading reaches largest size at md breakpoint (md:text-5xl)", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("h1")?.className).toContain("md:text-5xl");
  });

  it("hero sub-headline has mobile base font size (text-base)", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("section p")?.className).toContain("text-base");
  });

  it("hero sub-headline expands at md breakpoint (md:text-xl)", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("section p")?.className).toContain("md:text-xl");
  });

  it("feature strip starts as single column on mobile (grid-cols-1)", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector(".grid")?.className).toContain("grid-cols-1");
  });

  it("feature strip expands to three columns at md breakpoint (md:grid-cols-3)", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector(".grid")?.className).toContain("md:grid-cols-3");
  });

  it("feature section has mobile base padding (py-12)", () => {
    const { container } = render(<HomePage />);
    const sections = container.querySelectorAll("section");
    expect(sections[1]?.className).toContain("py-12");
  });

  it("feature section has expanded desktop padding (md:py-20)", () => {
    const { container } = render(<HomePage />);
    const sections = container.querySelectorAll("section");
    expect(sections[1]?.className).toContain("md:py-20");
  });

  it("feature strip has responsive gap (gap-8 and md:gap-12)", () => {
    const { container } = render(<HomePage />);
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("gap-8");
    expect(grid?.className).toContain("md:gap-12");
  });

  it("hero inner content is max-width constrained (max-w-3xl)", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector(".max-w-3xl")).toBeInTheDocument();
  });

  it("feature strip inner content is max-width constrained (max-w-5xl)", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector(".max-w-5xl")).toBeInTheDocument();
  });
});

// ── Dashboard page ───────────────────────────────────────────────────────────

describe("DashboardPage — responsive layout classes", () => {
  it("wrapper has horizontal padding (px-6)", () => {
    const { container } = render(<DashboardPage />);
    expect(container.querySelector(".px-6")).toBeInTheDocument();
  });

  it("wrapper has max-width constraint (max-w-7xl)", () => {
    const { container } = render(<DashboardPage />);
    expect(container.querySelector(".max-w-7xl")).toBeInTheDocument();
  });

  it("wrapper is horizontally centred (mx-auto)", () => {
    const { container } = render(<DashboardPage />);
    expect(container.querySelector(".mx-auto")).toBeInTheDocument();
  });
});
