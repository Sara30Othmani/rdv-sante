import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { fail, json, serverError } from "@/lib/http";
import StockMovement from "@/models/StockMovement";
import StockItem from "@/models/StockItem";
import { toStockMovementDTO } from "@/lib/dto";

/** GET /api/stock/[id]/movements */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) return fail(400, "Identifiant invalide.");

  try {
    await connectDB();

    // Vérifier que le stock item appartient bien au médecin
    const item = await StockItem.findOne({ _id: id, doctorId: user.id });
    if (!item) return fail(404, "Article de stock introuvable.");

    const movements = await StockMovement.find({ stockItemId: id, doctorId: user.id })
      .sort({ createdAt: -1 })
      .lean();

    return json(movements.map(toStockMovementDTO));
  } catch (e) {
    return serverError(e);
  }
}
