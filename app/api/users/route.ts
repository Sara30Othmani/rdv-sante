import UserModel from "@/models/User";
import { connectDB } from "@/lib/mongodb";
import { fail, json, serverError } from "@/lib/http";

/**
 * ⚠ DÉMO : liste publique des profils pour le sélecteur de connexion.
 * Désactivée (404) tant que ALLOW_DEMO_LOGIN n'est pas "true" ;
 * à supprimer avec le vrai module d'authentification.
 */
export async function GET() {
  if (process.env.ALLOW_DEMO_LOGIN !== "true") return fail(404, "Introuvable.");
  try {
    await connectDB();
    const users = await UserModel.find({ isActive: true })
      .select("name role")
      .sort({ role: 1, name: 1 })
      .lean();
    return json(
      users.map((u) => ({ id: String(u._id), name: u.name, role: u.role }))
    );
  } catch (e) {
    return serverError(e);
  }
}
