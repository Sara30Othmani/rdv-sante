import { NextRequest } from "next/server";
import { clearAuthCookies } from "@/lib/cookies";
import { json } from "@/lib/http";

/** Déconnexion : supprime les cookies de session. */
export async function POST(_req: NextRequest) {
  await clearAuthCookies();
  return json({ ok: true });
}