"use client";

import { useSyncExternalStore } from "react";
import type { Role } from "./feedbacks/types";

export type SessionUser = { id: string; name: string; role: Role; emailVerified?: boolean };

const EVENT = "session-change";

let _user: SessionUser | null = null;

/** Lit l'utilisateur en cache (mis à jour par AuthProvider). */
export function getSessionUser(): SessionUser | null {
  return _user;
}

/** Accepte un rôle quelconque (string) et le valide. */
export function setSession(user: { id: string; name: string; role: string; emailVerified?: boolean } | null) {
  if (!user) {
    _user = null;
  } else {
    const role: Role = user.role === "DOCTOR" ? "DOCTOR" : "PATIENT";
    _user = { id: user.id, name: user.name, role, emailVerified: user.emailVerified };
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Supprime l'utilisateur en cache (déconnexion). */
export function clearSession() {
  _user = null;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

/** Utilisateur connecté, ou null. */
export function useSession() {
  const user = useSyncExternalStore(subscribe, () => _user, () => null);
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