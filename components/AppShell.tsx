"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import PwaRegister from "@/components/PwaRegister";
import { useAuth } from "@/lib/auth-client";

export default function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <PwaRegister />
      <Suspense fallback={null}>
        <div className="app-shell">
          {isAuthenticated && (
            <Suspense fallback={<aside className="sidebar" />}>
              <Sidebar />
            </Suspense>
          )}
          <div className={`app-main${isAuthenticated ? "" : " no-sidebar"}`}>
            {children}
          </div>
        </div>
      </Suspense>
    </>
  );
}
