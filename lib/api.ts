"use client";

import { getSessionUser } from "./session";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** fetch + identité de la session (en-tête lu par lib/auth.ts côté serveur). */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const user = getSessionUser();
  if (user) headers.set("x-user-id", user.id);
  if (init.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  return fetch(path, { ...init, headers });
}

/** Renvoie le JSON, ou lève une ApiError avec le message du serveur. */
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    let message = "Une erreur est survenue.";
    try {
      message = (await res.json()).error ?? message;
    } catch {
      /* corps vide */
    }
    throw new ApiError(message, res.status);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
