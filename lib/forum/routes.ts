import type { RoleSegment } from "../roles";

/** Routes du forum dans un espace (/patient/forum ou /medecin/forum). */
export function forumRoutes(segment: RoleSegment) {
  const base = `/${segment}/forum`;
  return {
    list: base,
    question: (id: string, notice?: "created" | "updated") =>
      `${base}/question?id=${encodeURIComponent(id)}${notice ? `&notice=${notice}` : ""}`,
    form: (id?: string) => (id ? `${base}/form?id=${encodeURIComponent(id)}` : `${base}/form`),
  };
}
