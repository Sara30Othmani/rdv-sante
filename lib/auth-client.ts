"use client";

import { useEffect } from "react";
import { useSession, setSession, clearSession } from "./session";
import { apiJson } from "./api";

export type AuthUser = {
  id: string;
  name: string;
  role: string;
  emailVerified?: boolean;
};

/** Charge l'utilisateur connecté depuis le serveur (cookie). */
export function useAuth() {
  const { user } = useSession();

  useEffect(() => {
    if (user) return;
    let cancelled = false;
    apiJson<AuthUser>("/api/auth/me")
      .then((u) => {
        if (!cancelled) setSession(u);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { user, isAuthenticated: !!user };
}

/** Déconnexion : appelle le serveur puis nettoie le cache local. */
export async function logout() {
  try {
    await apiJson("/api/auth/logout", { method: "POST" });
  } finally {
    clearSession();
  }
}