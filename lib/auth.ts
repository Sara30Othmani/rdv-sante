import type { Role } from "@/lib/feedbacks/types";
import UserModel from "@/models/User";
import { connectDB } from "./mongodb";
import { fail } from "./http";
import { verifyAccessToken } from "./tokens";

export type AuthUser = { id: string; name: string; role: Role };

/** Lit un cookie depuis l'en-tête `Cookie` de la requête. */
function getCookieFromHeader(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const pair of header.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const key = pair.slice(0, eq).trim();
    if (key === name) return decodeURIComponent(pair.slice(eq + 1).trim());
  }
  return null;
}

/** Cookie `access_token` (session). */
export function getAccessCookie(req: Request): string | null {
  return getCookieFromHeader(req, "access_token");
}

/** Cookie `refresh_token` (pour rafraîchir la session). */
export function getRefreshCookie(req: Request): string | null {
  return getCookieFromHeader(req, "refresh_token");
}

/**
 * Utilisateur connecté (cookie `access_token`), ou null.
 * ⇿ Le token est vérifié côté serveur : l'identité n'est pas falsifiable.
 */
export async function getCurrentUser(req: Request): Promise<AuthUser | null> {
  const token = getAccessCookie(req);

  
  console.log("[AUTH] Cookie access_token présent :", !!token);

  if (!token) {
    console.log("[AUTH] Aucun access token");
    return null;
  }

  
  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload) return null;

  try {
    await connectDB();
    const user = await UserModel.findOne({ _id: payload.sub, isActive: true })
      .select("name role")
      .lean();
    if (!user) return null;
    return { id: String(user._id), name: user.name, role: user.role };
  } catch {
    return null;
  }
}

type Auth =
  | { user: AuthUser; error?: undefined }
  | { error: Response; user?: undefined };

/** Renvoie l'utilisateur, ou une réponse 401/403 à retourner telle quelle. */
export async function requireUser(req: Request, roles?: Role[]): Promise<Auth> {
  const user = await getCurrentUser(req);
  if (!user) return { error: fail(401, "Non connecté.") };
  if (roles && !roles.includes(user.role))
    return { error: fail(403, "Action non autorisée pour ce profil.") };
  return { user };
}
