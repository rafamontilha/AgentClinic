import type { Metadata } from "next";
import Link from "next/link";
import { NavMenu } from "./components/NavMenu";
import "@picocss/pico/css/pico.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentClinic",
  description: "The clinic for ailing AI agents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <nav>
            <Link href="/">
              <strong>AgentClinic</strong>
            </Link>
            <NavMenu />
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
