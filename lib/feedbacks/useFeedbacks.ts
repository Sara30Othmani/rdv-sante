"use client";

import { useEffect, useState } from "react";
import { getSessionUser } from "../session";
import type { Feedback } from "./types";
import { canView } from "./rules";
import { listFeedbacks, syncPending } from "./service";

/**
 * Synchronise avec le serveur (si possible) puis lit le cache local.
 * Ne renvoie que les feedbacks du profil connecté (les siens pour un patient,
 * ceux qui lui sont adressés pour un médecin) : les pages n'ont rien à filtrer.
 */
export function useFeedbacks() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Hors ligne ou serveur indisponible : on affiche simplement le cache.
      await syncPending().catch((e) => console.warn("Synchronisation impossible :", e));
      try {
        const all = await listFeedbacks();
        const me = getSessionUser();
        const mine = me ? all.filter((f) => canView(f, me.id, me.role)) : [];
        if (!cancelled) setItems(mine);
      } catch (e) {
        console.error("Erreur de chargement des feedbacks :", e);
        if (!cancelled) setError("Impossible de charger les feedbacks.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error };
}
