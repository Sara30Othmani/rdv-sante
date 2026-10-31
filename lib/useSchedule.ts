
"use client";

import { useEffect, useState, useCallback } from "react";
import { apiJson } from "./api";
import { useSession } from "./session";
import type { WeeklySchedule } from "./schedule";
import { toast } from "sonner";

export function useSchedule() {
  const { user } = useSession();
  const userId = user?.id ?? null;

  const [schedule, setSchedule] =
    useState<WeeklySchedule | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Charger les horaires
  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    apiJson<{ schedule: WeeklySchedule }>(
      "/api/doctor/schedule"
    )
      .then((data) => {
        if (!cancelled) {
          setSchedule(data.schedule);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message || "Chargement impossible.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Enregistrer les horaires
  const save = useCallback(async (next: WeeklySchedule) => {
    setSaving(true);
    setError("");

    // Normaliser les jours activés sans plage horaire
    const normalizedSchedule: WeeklySchedule = {
      ...next,
      days: next.days.map((day) => ({
        ...day,
        ranges:
          day.enabled && day.ranges.length === 0
            ? [{ start: "09:00", end: "12:00" }]
            : day.ranges,
      })),
    };

    try {
      const res = await apiJson<{
        schedule: WeeklySchedule;
        outsideCount: number;
      }>("/api/doctor/schedule", {
        method: "PUT",
        body: JSON.stringify({
          schedule: normalizedSchedule,
        }),
      });

      setSchedule(res.schedule);
      
      return true;

    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Enregistrement impossible.";

      setError(message);
      return false;

    } finally {
      setSaving(false);
    }
  }, []);

  return {
    schedule,
    loading,
    error,
    saving,
    save,
  };
}

