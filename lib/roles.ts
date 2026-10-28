import type { Role } from "./feedbacks/types";

/**
 * Le profil est déterminé par l'URL : /patient/… ou /medecin/…
 * Seule table de correspondance « segment d'URL ↔ rôle ».
 */
export const ROLE_BY_SEGMENT = {
  patient: "PATIENT",
  medecin: "DOCTOR",
} as const satisfies Record<string, Role>;

export type RoleSegment = keyof typeof ROLE_BY_SEGMENT;

export const SEGMENT_BY_ROLE: Record<Role, RoleSegment> = {
  PATIENT: "patient",
  DOCTOR: "medecin",
};

export const SPACE_LABEL: Record<RoleSegment, string> = {
  patient: "Espace patient",
  medecin: "Espace médecin",
};

export function isRoleSegment(value: string): value is RoleSegment {
  return Object.prototype.hasOwnProperty.call(ROLE_BY_SEGMENT, value);
}

/** "/medecin/feedbacks/detail" → "medecin" ; "/" → null */
export function segmentFromPath(pathname: string): RoleSegment | null {
  const first = pathname.split("/")[1] ?? "";
  return isRoleSegment(first) ? first : null;
}

/** Toutes les routes « feedbacks » d'un espace, au même endroit. */
export function feedbackRoutes(segment: RoleSegment) {
  const base = `/${segment}/feedbacks`;
  return {
    dashboard: `${base}/dashboard`,
    list: base,
    detail: (id: string) => `${base}/detail?id=${encodeURIComponent(id)}`,
    form: (id?: string) =>
      id ? `${base}/form?id=${encodeURIComponent(id)}` : `${base}/form`,
  };
}
