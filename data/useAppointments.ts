"use client";

import { useSyncExternalStore } from "react";
import type { Appointment } from "./mockData";
import {
  APPOINTMENTS_EVENT,
  APPOINTMENTS_STORAGE_KEY,
  parseAppointments,
  readRawAppointments,
} from "./appointmentStorage";

const EMPTY: Appointment[] = [];

function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === APPOINTMENTS_STORAGE_KEY) callback();
  };
  window.addEventListener(APPOINTMENTS_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(APPOINTMENTS_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

// getSnapshot DOIT renvoyer la même référence tant que les données ne changent
// pas, sinon React boucle à l'infini : on met donc le résultat en cache.
let cachedRaw: string | null | undefined;
let cachedValue: Appointment[] = EMPTY;

function getSnapshot(): Appointment[] {
  const raw = readRawAppointments();
  if (raw !== cachedRaw || cachedValue === EMPTY) {
    cachedRaw = raw;
    cachedValue = parseAppointments(raw);
  }
  return cachedValue;
}

const getServerSnapshot = () => EMPTY;

/**
 * Liste des rendez-vous, toujours à jour (même après une modification faite
 * par un autre composant ou un autre onglet).
 * `loaded` vaut false pendant le rendu serveur / l'hydratation.
 */
export function useAppointments() {
  const appointments = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  return { appointments, loaded: appointments !== EMPTY };
}
