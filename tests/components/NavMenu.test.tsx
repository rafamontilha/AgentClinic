// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavMenu } from "@/app/components/NavMenu";

afterEach(() => cleanup());

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

// ── Hamburger toggle behaviour ───────────────────────────────────────────────

describe("NavMenu — hamburger toggle behaviour", () => {
  it("renders a toggle button", () => {
    render(<NavMenu />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("button has aria-expanded=false initially", () => {
    render(<NavMenu />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
  });

  it("button label says 'Open navigation menu' initially", () => {
    render(<NavMenu />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Open navigation menu"
    );
  });

  it("mobile dropdown is not rendered initially", () => {
    render(<NavMenu />);
    expect(document.getElementById("mobile-nav")).not.toBeInTheDocument();
  });

  it("clicking the button renders the mobile dropdown", () => {
    render(<NavMenu />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.getElementById("mobile-nav")).toBeInTheDocument();
  });

  it("aria-expanded becomes true when dropdown is open", () => {
    render(<NavMenu />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("button label changes to 'Close navigation menu' when open", () => {
    render(<NavMenu />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Close navigation menu"
    );
  });

  it("clicking the button again closes the dropdown", () => {
    render(<NavMenu />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(document.getElementById("mobile-nav")).not.toBeInTheDocument();
  });

  it("clicking a nav link in the dropdown closes it", () => {
    render(<NavMenu />);
    fireEvent.click(screen.getByRole("button"));
    const firstLink = document.getElementById("mobile-nav")!.querySelector("a")!;
    fireEvent.click(firstLink);
    expect(document.getElementById("mobile-nav")).not.toBeInTheDocument();
  });
});

// ── Responsive CSS classes ───────────────────────────────────────────────────

describe("NavMenu — responsive CSS classes", () => {
  it("desktop link container has 'hidden' class (invisible on mobile)", () => {
    const { container } = render(<NavMenu />);
    expect(container.firstElementChild?.className).toContain("hidden");
  });

  it("desktop link container has 'md:flex' class (visible on tablet+)", () => {
    const { container } = render(<NavMenu />);
    expect(container.firstElementChild?.className).toContain("md:flex");
  });

  it("hamburger button has 'md:hidden' class (hidden on tablet+)", () => {
    render(<NavMenu />);
    expect(screen.getByRole("button").className).toContain("md:hidden");
  });

  it("mobile dropdown has 'md:hidden' class when open (CSS safety net)", () => {
    render(<NavMenu />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.getElementById("mobile-nav")?.className).toContain("md:hidden");
  });

  it("mobile dropdown has 'absolute' positioning (overlays content)", () => {
    render(<NavMenu />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.getElementById("mobile-nav")?.className).toContain("absolute");
  });
});

// ── Link inventory ───────────────────────────────────────────────────────────

describe("NavMenu — link inventory", () => {
  it("desktop container has exactly 4 links", () => {
    const { container } = render(<NavMenu />);
    expect(container.firstElementChild?.querySelectorAll("a")).toHaveLength(4);
  });

  it("mobile dropdown has exactly 4 links when open", () => {
    render(<NavMenu />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.getElementById("mobile-nav")!.querySelectorAll("a")).toHaveLength(4);
  });

  it("nav links cover Dashboard, Patients, Ailments, and Alerts", () => {
    render(<NavMenu />);
    fireEvent.click(screen.getByRole("button"));
    const labels = Array.from(
      document.getElementById("mobile-nav")!.querySelectorAll("a")
    ).map((a) => a.textContent);
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Patients");
    expect(labels).toContain("Ailments");
    expect(labels).toContain("Alerts");
  });

  it("nav links point to correct hrefs", () => {
    render(<NavMenu />);
    fireEvent.click(screen.getByRole("button"));
    const hrefs = Array.from(
      document.getElementById("mobile-nav")!.querySelectorAll("a")
    ).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/dashboard/patients");
    expect(hrefs).toContain("/dashboard/ailments");
    expect(hrefs).toContain("/dashboard/alerts");
  });
});
