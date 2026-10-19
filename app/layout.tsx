import type { Metadata, Viewport } from "next";

import { Geist, Geist_Mono } from "next/font/google";

import Link from "next/link";

import "./globals.css";

import PwaRegister from "@/components/PwaRegister";

import OnlineBadge from "@/components/OnlineBadge";

import InstallButton from "@/components/InstallButton";

import RoleSwitcher from "@/components/RoleSwitcher";
 
const geistSans = Geist({

  variable: "--font-geist-sans",

  subsets: ["latin"],

});
 
const geistMono = Geist_Mono({

  variable: "--font-geist-mono",

  subsets: ["latin"],

});
 
export const metadata: Metadata = {

  title: "RDV Santé",

  description: "Smart Medical Appointment - Gestion des feedbacks",

  appleWebApp: { capable: true, title: "RDV Santé" },

};
 
export const viewport: Viewport = {

  themeColor: "#0ea5e9",

  width: "device-width",

  initialScale: 1,

};
 
export default function RootLayout({ children }: LayoutProps<"/">) {

  return (
<html

      lang="fr"

      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
>
<body className="min-h-full flex flex-col bg-gray-50">
<PwaRegister />
<header className="sticky top-0 z-10 border-b bg-white">
<div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 p-3">
<Link href="/" className="font-bold text-sky-700">

              RDV Santé
</Link>
<div className="flex flex-wrap items-center gap-2">
<InstallButton />
<OnlineBadge />
<RoleSwitcher />
</div>
</div>
</header>
<main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
</body>
</html>

  );

}
 