"use client";

import { useAuth } from "@/lib/auth-client";

/**
 * Fournit la session à l'ensemble de l'application :
 * charge l'utilisateur depuis le serveur (cookie) au premier rendu.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuth();
  return <>{children}</>;
}