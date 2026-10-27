import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { json, serverError } from "@/lib/http";

/** Renvoie l'utilisateur connecté (session). */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    return json(auth.user);
  } catch (e) {
    return serverError(e);
  }
}