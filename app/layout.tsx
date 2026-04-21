import type { Metadata } from "next";
import Link from "next/link";
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
        <nav className="bg-gray-900 text-white px-6 py-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight hover:text-gray-300 transition-colors">
              AgentClinic
            </Link>
            <div className="flex gap-8 text-sm font-medium">
              <Link href="/dashboard" className="hover:text-gray-300 transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard/patients" className="hover:text-gray-300 transition-colors">
                Patients
              </Link>
              <Link href="/dashboard/ailments" className="hover:text-gray-300 transition-colors">
                Ailments
              </Link>
              <Link href="/dashboard/alerts" className="hover:text-gray-300 transition-colors">
                Alerts
              </Link>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
