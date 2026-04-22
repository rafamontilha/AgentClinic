"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./NavMenu.module.css";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/patients", label: "Patients" },
  { href: "/dashboard/ailments", label: "Ailments" },
  { href: "/dashboard/alerts", label: "Alerts" },
];

export function NavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      {/* Desktop — hidden below 768px via CSS module */}
      <ul data-testid="desktop-links" className={styles.desktopLinks}>
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>

      {/* Hamburger — hidden at 768px+ via CSS module */}
      <button
        className={styles.hamburger}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div id="mobile-nav" className={styles.mobileNav}>
          <ul>
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
