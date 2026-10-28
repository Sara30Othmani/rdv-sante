import { Types } from "mongoose";
import type { Role } from "@/lib/feedbacks/types";
import UserModel from "@/models/User";
import { connectDB } from "./mongodb";
import { fail } from "./http";

export type AuthUser = { id: string; name: string; role: Role };

/**
 * ⚠ MODE DÉMO — seule fonction à remplacer quand le vrai module
 * d'authentification sera branché (cookie de session, JWT, Auth.js…).
 *
 * Ici l'identité vient de l'en-tête `x-user-id`, que n'importe qui peut
 * falsifier. C'est pourquoi tout est désactivé tant que
 * ALLOW_DEMO_LOGIN n'est pas "true".
 */
export async function getCurrentUser(req: Request): Promise<AuthUser | null> {
  if (process.env.ALLOW_DEMO_LOGIN !== "true") return null;

  const id = req.headers.get("x-user-id");
  if (!id || !Types.ObjectId.isValid(id)) return null;

  await connectDB();
  const user = await UserModel.findOne({ _id: id, isActive: true })
    .select("name role")
    .lean();
  if (!user) return null;

  return { id: String(user._id), name: user.name, role: user.role };
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
