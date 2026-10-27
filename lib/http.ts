export const json = (data: unknown, status = 200) =>
  Response.json(data, { status });

export const fail = (status: number, message: string) =>
  Response.json({ error: message }, { status });

export function isDuplicateKey(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
}

export function serverError(e: unknown) {
  console.error(e);
  return fail(500, "Erreur serveur.");
}
