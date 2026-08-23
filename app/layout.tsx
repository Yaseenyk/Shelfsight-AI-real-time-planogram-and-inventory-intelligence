import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";

import { AuthGate } from "@/components/auth/auth-gate";
import { MobileNav } from "@/components/layout/mobile-nav";
import { RouteGuard } from "@/components/layout/route-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { AuthProvider } from "@/lib/auth/context";

import "./globals.css";

// Self-hosted at build time by next/font -- no CDN request at runtime, so
// the dashboard still renders correctly on a shop machine with no internet.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "ShelfSight AI — Planogram & Inventory Intelligence",
  description:
    "Real-time phantom-inventory detection, planogram compliance, freshness classification and expiry OCR for retail shelves.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  // Cover the notch, and stop iOS zooming the page when an input is focused.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { color: "#0F1319" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${mono.variable} font-sans`}>
        <AuthProvider>
          <AuthGate>
            <div className="flex min-h-screen">
              <Sidebar />
              <RouteGuard>{children}</RouteGuard>
            </div>
            <MobileNav />
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
