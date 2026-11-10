"use client";

import { useEffect, useState } from "react";
import { apiJson } from "./api";
import { useSession } from "./session";
import type { Appointment, Doctor, NewAppointment } from "./appointments";

const REFRESH_EVENT = "appointments-refresh";
const refreshAppointments = () => window.dispatchEvent(new Event(REFRESH_EVENT));

/** Rendez-vous du profil connecté (rechargés après chaque modification). */
export function useAppointments() {
  const { user } = useSession();
  const userId = user?.id ?? null;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await apiJson<Appointment[]>("/api/appointments");
        if (!cancelled) {
          setAppointments(data);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message || "Chargement impossible.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    window.addEventListener(REFRESH_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(REFRESH_EVENT, load);
    };
  }, [userId]);

  return { appointments, loaded, error };
}

export async function createAppointment(data: NewAppointment) {
  const created = await apiJson<Appointment>("/api/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
  refreshAppointments();
  return created;
}

export async function patchAppointment(
  id: string,
  changes: Partial<Pick<Appointment, "date" | "time" | "reason" | "status" | "notes" | "cancelReason">>
) {
  const updated = await apiJson<Appointment>(`/api/appointments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
  refreshAppointments();
  return updated;
}


/** Liste des médecins vérifiés (avec note moyenne). */
export function useDoctors() {
  const { user } = useSession();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDoctors() {
      try {
        setLoaded(false);
        setError("");

        const data = await apiJson<Doctor[]>("/api/doctors");

        if (!cancelled) {
          setDoctors(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Chargement des médecins impossible."
          );
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    loadDoctors();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { doctors, loaded, error };
}

