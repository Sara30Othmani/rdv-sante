"use client";

// Session de DÉMONSTRATION (profil choisi dans une liste), en attendant le vrai
// module d'authentification. Quand il existera, seuls ce fichier et
// lib/auth.ts (côté serveur) devront changer.
import { useMemo, useSyncExternalStore } from "react";
import type { Role } from "./feedbacks/types";

export type SessionUser = { id: string; name: string; role: Role };

const KEY = "session";
const EVENT = "session-change";

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    const validRole = v?.role === "PATIENT" || v?.role === "DOCTOR";
    return validRole && typeof v.id === "string" && typeof v.name === "string"
      ? { id: v.id, name: v.name, role: v.role }
      : null;
  } catch {
    return null;
  }
}

/** Utilisable hors composant (services, appels API). */
export const getSessionUser = () => parse(readRaw());

export function setSession(user: SessionUser) {
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    /* stockage indisponible : on ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignoré */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Utilisateur connecté, ou null (pas encore choisi / déconnecté). */
export function useSession() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const user = useMemo(() => parse(raw), [raw]);
  return { user };
}

/** Pour les pages protégées par RoleGuard : l'utilisateur existe forcément. */
export function useUser(): SessionUser {
  const { user } = useSession();
  if (!user) throw new Error("useUser() doit être utilisé sous <RoleGuard>.");
  return user;
}

/** false pendant le rendu serveur / l'hydratation, true ensuite. */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
