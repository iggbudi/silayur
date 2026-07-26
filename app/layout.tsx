import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DevRuntimeGuard } from "./components/dev-runtime-guard";
// Order matters: tokens (CSS variables) -> base (resets) -> globals (components).
import "./styles/tokens.css";
import "./styles/base.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SILAYUR — Dashboard Operasional",
  description:
    "Dashboard operasional Silayur Park Semarang.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DevRuntimeGuard />
        {children}
      </body>
    </html>
  );
}
