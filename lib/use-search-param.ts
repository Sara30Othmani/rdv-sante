"use client";

import { useSyncExternalStore } from "react";

/**
 * Lit un paramètre de requête côté client, réactif (SSR-safe).
 * À utiliser dans un composant client uniquement.
 */
export function useSearchParam(name: string): string | null {
  const getSnapshot = () => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get(name);
  };
  const getServerSnapshot = () => null;
  return useSyncExternalStore(
    () => () => {},
    getSnapshot,
    getServerSnapshot
  );
}