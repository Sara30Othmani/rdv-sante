import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import PwaRegister from "@/components/PwaRegister";
import { AuthProvider } from "@/components/AuthProvider";
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
        <Suspense fallback={null}>
          <AuthProvider>
            <div className="app-shell">
              <Suspense fallback={<aside className="sidebar" />}>
                <Sidebar />
              </Suspense>
              <div className="app-main">{children}</div>
            </div>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}