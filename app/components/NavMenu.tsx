"use client";

import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/patients", label: "Patients" },
  { href: "/dashboard/ailments", label: "Ailments" },
  { href: "/dashboard/alerts", label: "Alerts" },
];

export function NavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop — hidden below md */}
      <div className="hidden md:flex gap-8 text-sm font-medium">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="hover:text-gray-300 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Mobile toggle — hidden at md and above */}
      <button
        className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        {open ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div
          id="mobile-nav"
          className="md:hidden absolute left-0 right-0 top-full bg-gray-900 border-t border-gray-700 shadow-lg z-50"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-6 py-4 text-sm font-medium hover:bg-gray-800 transition-colors"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
