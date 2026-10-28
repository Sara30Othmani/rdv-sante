"use client";

import { useEffect, useState } from "react";
import type { SessionUser } from "./session";

/** Liste des profils de démonstration (désactivée si ALLOW_DEMO_LOGIN ≠ "true"). */
export function useDemoUsers() {
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users")
      .then(async (res) => {
        if (!res.ok) throw new Error("La connexion de démonstration est désactivée.");
        return (await res.json()) as SessionUser[];
      })
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { users, loading, error };
}
