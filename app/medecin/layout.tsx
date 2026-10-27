import type { ReactNode } from "react";
import RoleGuard from "@/components/RoleGuard";

export default function Layout({ children }: { children: ReactNode }) {
  return <RoleGuard segment="medecin">{children}</RoleGuard>;
}
