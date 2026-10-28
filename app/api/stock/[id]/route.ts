import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { fail, json, serverError } from "@/lib/http";
import StockItem from "@/models/StockItem";
import StockMovement from "@/models/StockMovement";
import { toStockItemDTO } from "@/lib/dto";

/** GET /api/stock/[id] */
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
    const item = await StockItem.findOne({ _id: id, doctorId: user.id })
      .populate("medicationId")
      .lean();

    if (!item) return fail(404, "Article de stock introuvable.");

    return json(toStockItemDTO(item));
  } catch (e) {
    return serverError(e);
  }
}

/**
 * PATCH /api/stock/[id]
 * Modifie la quantité, le seuil d'alerte, l'emplacement, les lots, ou applique un mouvement.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;
  const { user } = auth;
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) return fail(400, "Identifiant invalide.");

  try {
    const body = await req.json();
    await connectDB();

    const stockItem = await StockItem.findOne({ _id: id, doctorId: user.id });
    if (!stockItem) return fail(404, "Article de stock introuvable.");

    // Cas 1 : Mouvement rapide explicite (IN, OUT, ADJUSTMENT, EXPIRED)
    if (body.action) {
      const action = body.action as "IN" | "OUT" | "ADJUSTMENT" | "EXPIRED";
      const movementQty = Math.max(0, Number(body.movementQuantity) || 0);
      const reason = body.reason?.trim() || "";
      const batchNum = body.batchNumber?.trim();

      if (action === "IN") {
        if (movementQty <= 0) return fail(400, "La quantité ajoutée doit être supérieure à 0.");
        stockItem.quantity += movementQty;
        if (batchNum) {
          const batch = stockItem.batches.find(
            (b) => b.batchNumber.toLowerCase() === batchNum.toLowerCase()
          );
          if (batch) batch.quantity += movementQty;
          else stockItem.batches.push({ batchNumber: batchNum, quantity: movementQty });
        }
      } else if (action === "OUT" || action === "EXPIRED") {
        if (movementQty <= 0) return fail(400, "La quantité retirée doit être supérieure à 0.");
        if (movementQty > stockItem.quantity) {
          return fail(400, `Quantité insuffisante en stock (${stockItem.quantity} disponibles).`);
        }
        stockItem.quantity -= movementQty;
        if (batchNum) {
          const batch = stockItem.batches.find(
            (b) => b.batchNumber.toLowerCase() === batchNum.toLowerCase()
          );
          if (batch) {
            batch.quantity = Math.max(0, batch.quantity - movementQty);
          }
        }
      } else if (action === "ADJUSTMENT") {
        // Remplacement direct par inventaire
        const previousQty = stockItem.quantity;
        const newQty = Math.max(0, Number(body.movementQuantity) || 0);
        stockItem.quantity = newQty;
      }

      await StockMovement.create({
        stockItemId: stockItem._id,
        doctorId: user.id,
        type: action,
        quantity: movementQty,
        batchNumber: batchNum || undefined,
        reason: reason || (action === "IN" ? "Réapprovisionnement" : action === "OUT" ? "Utilisation" : action === "EXPIRED" ? "Produit périmé" : "Inventaire"),
        createdBy: user.id,
      });
    }

    // Cas 2 : Mise à jour directe de champs (seuil, emplacement, unité, quantité directe)
    if (body.lowStockThreshold !== undefined) {
      stockItem.lowStockThreshold = Math.max(0, Number(body.lowStockThreshold));
    }

    if (body.location !== undefined) {
      stockItem.location = String(body.location).trim();
    }

    if (body.unit !== undefined) {
      stockItem.unit = String(body.unit).trim();
    }

    if (body.quantity !== undefined && !body.action) {
      const newQty = Math.max(0, Number(body.quantity));
      const delta = newQty - stockItem.quantity;
      if (delta !== 0) {
        await StockMovement.create({
          stockItemId: stockItem._id,
          doctorId: user.id,
          type: "ADJUSTMENT",
          quantity: Math.abs(delta),
          reason: body.reason?.trim() || "Ajustement d'inventaire",
          createdBy: user.id,
        });
      }
      stockItem.quantity = newQty;
    }

    // Mise à jour éventuelle des lots
    if (Array.isArray(body.batches)) {
      stockItem.batches = body.batches.map((b: any) => ({
        batchNumber: String(b.batchNumber || "Lot").trim(),
        quantity: Math.max(0, Number(b.quantity) || 0),
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : undefined,
      }));
    }

    await stockItem.save();
    await stockItem.populate("medicationId");

    return json(toStockItemDTO(stockItem.toObject()));
  } catch (e) {
    return serverError(e);
  }
}

/**
 * DELETE /api/stock/[id]
 * Supprime un article du stock du médecin.
 */
export async function DELETE(
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
    const deleted = await StockItem.findOneAndDelete({ _id: id, doctorId: user.id });
    if (!deleted) return fail(404, "Article introuvable.");

    // Nettoyage des mouvements associés
    await StockMovement.deleteMany({ stockItemId: id });

    return json({ success: true, message: "Article supprimé du stock avec succès." });
  } catch (e) {
    return serverError(e);
  }
}
