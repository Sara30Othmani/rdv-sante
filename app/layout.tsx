import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RDV Santé",
    template: "%s | RDV Santé",
  },
  description: "Application de gestion des rendez-vous médicaux.",
  applicationName: "RDV Santé",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RDV Santé",
  },
};

export const viewport: Viewport = {
  themeColor: "#087f8c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <PwaRegister />
        <div className="app-shell">
          <Suspense fallback={<aside className="sidebar" />}>
            <Sidebar />
          </Suspense>
          <div className="app-main">{children}</div>
        </div>
      </body>
    </html>
  );
}