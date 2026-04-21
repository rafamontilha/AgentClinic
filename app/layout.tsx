import type { Metadata } from "next";
import Link from "next/link";
import { NavMenu } from "./components/NavMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentClinic",
  description: "The clinic for ailing AI agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {/* relative so the mobile dropdown can be absolute top-full */}
        <nav className="relative bg-gray-900 text-white px-6 py-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight hover:text-gray-300 transition-colors"
            >
              AgentClinic
            </Link>
            <NavMenu />
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
