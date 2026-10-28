import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { fail, json, serverError } from "@/lib/http";
import StockItem from "@/models/StockItem";
import StockMovement from "@/models/StockMovement";
import Medication from "@/models/Medication";
import { toStockItemDTO } from "@/lib/dto";
import type { StockKpis } from "@/lib/stock/types";

/**
 * GET /api/stock
 * Liste des articles en stock du médecin connecté + indicateurs de synthèse (KPIs).
 */
export async function GET(req: Request) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase();
  const filterStatus = searchParams.get("status") || "ALL";
  const filterCategory = searchParams.get("category");

  try {
    await connectDB();

    const items = await StockItem.find({ doctorId: user.id })
      .populate("medicationId")
      .sort({ updatedAt: -1 })
      .lean();

    const dtos = items.map(toStockItemDTO);

    // Calcul des statistiques globales (non filtrées)
    const kpis: StockKpis = {
      totalItems: dtos.length,
      totalQuantity: dtos.reduce((sum, item) => sum + item.quantity, 0),
      lowStockCount: dtos.filter((item) => item.status === "LOW_STOCK").length,
      outOfStockCount: dtos.filter((item) => item.status === "OUT_OF_STOCK").length,
      expiringCount: dtos.filter(
        (item) => item.expirationStatus === "EXPIRING_SOON" || item.expirationStatus === "EXPIRED"
      ).length,
      expiredCount: dtos.filter((item) => item.expirationStatus === "EXPIRED").length,
    };

    // Filtrage des résultats si demandé
    let filtered = dtos;

    if (q) {
      filtered = filtered.filter(
        (item) =>
          item.medication.name.toLowerCase().includes(q) ||
          item.medication.genericName?.toLowerCase().includes(q) ||
          item.medication.category?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q) ||
          item.batches.some((b) => b.batchNumber.toLowerCase().includes(q))
      );
    }

    if (filterCategory && filterCategory !== "ALL") {
      filtered = filtered.filter((item) => item.medication.category === filterCategory);
    }

    if (filterStatus === "LOW_STOCK") {
      filtered = filtered.filter((item) => item.status === "LOW_STOCK");
    } else if (filterStatus === "OUT_OF_STOCK") {
      filtered = filtered.filter((item) => item.status === "OUT_OF_STOCK");
    } else if (filterStatus === "IN_STOCK") {
      filtered = filtered.filter((item) => item.status === "IN_STOCK");
    } else if (filterStatus === "EXPIRING") {
      filtered = filtered.filter(
        (item) => item.expirationStatus === "EXPIRING_SOON" || item.expirationStatus === "EXPIRED"
      );
    }

    return json({ items: filtered, kpis });
  } catch (e) {
    return serverError(e);
  }
}

/**
 * POST /api/stock
 * Ajout d'un article au stock du médecin.
 */
export async function POST(req: Request) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const body = await req.json();
    let medicationId = body.medicationId ? String(body.medicationId).trim() : "";
    const name = body.name ? String(body.name).trim() : "";
    const quantity = Math.max(0, Number(body.quantity) || 0);
    const lowStockThreshold = Math.max(0, Number(body.lowStockThreshold) ?? 5);
    const unit = (body.unit?.trim() || "boîte").toLowerCase();
    const location = body.location?.trim() || "";
    const batchNumber = body.batchNumber?.trim() || "";
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;

    await connectDB();

    // Si aucun ID de médicament fourni, on le recherche ou on le crée
    if (!medicationId || !Types.ObjectId.isValid(medicationId)) {
      if (!name || name.length < 2) {
        return fail(400, "Veuillez sélectionner ou nommer un médicament / article.");
      }

      let med = await Medication.findOne({
        name: { $regex: `^${name}$`, $options: "i" },
      });

      if (!med) {
        med = await Medication.create({
          name,
          genericName: body.genericName?.trim() || undefined,
          form: body.form || "OTHER",
          dosage: body.dosage?.trim() || undefined,
          category: body.category?.trim() || "Matériel médical",
          manufacturer: body.manufacturer?.trim() || undefined,
          createdBy: user.id,
        });
      }
      medicationId = String(med._id);
    }

    // Vérifier si ce médecin a déjà cet article dans son stock
    let stockItem = await StockItem.findOne({
      doctorId: user.id,
      medicationId,
    });

    const initialBatch =
      batchNumber && quantity > 0
        ? [{ batchNumber, quantity, expiresAt }]
        : [];

    if (stockItem) {
      // Si l'article existe déjà, on l'incrémente et on enregistre l'entrée
      stockItem.quantity += quantity;
      if (location) stockItem.location = location;
      if (unit) stockItem.unit = unit;
      if (body.lowStockThreshold !== undefined) {
        stockItem.lowStockThreshold = lowStockThreshold;
      }

      if (batchNumber && quantity > 0) {
        const existingBatch = stockItem.batches.find(
          (b) => b.batchNumber.toLowerCase() === batchNumber.toLowerCase()
        );
        if (existingBatch) {
          existingBatch.quantity += quantity;
          if (expiresAt) existingBatch.expiresAt = expiresAt;
        } else {
          stockItem.batches.push({ batchNumber, quantity, expiresAt });
        }
      }

      await stockItem.save();

      // Mouvement d'entrée
      if (quantity > 0) {
        await StockMovement.create({
          stockItemId: stockItem._id,
          doctorId: user.id,
          type: "IN",
          quantity,
          batchNumber: batchNumber || undefined,
          reason: body.reason?.trim() || "Réapprovisionnement",
          createdBy: user.id,
        });
      }

      await stockItem.populate("medicationId");
      return json(toStockItemDTO(stockItem.toObject()), 200);
    }

    // Création d'un nouvel enregistrement de stock
    stockItem = await StockItem.create({
      doctorId: user.id,
      medicationId,
      quantity,
      lowStockThreshold,
      unit,
      location,
      batches: initialBatch,
    });

    // Mouvement d'entrée initial
    if (quantity > 0) {
      await StockMovement.create({
        stockItemId: stockItem._id,
        doctorId: user.id,
        type: "IN",
        quantity,
        batchNumber: batchNumber || undefined,
        reason: "Stock initial",
        createdBy: user.id,
      });
    }

    await stockItem.populate("medicationId");
    return json(toStockItemDTO(stockItem.toObject()), 201);
  } catch (e) {
    return serverError(e);
  }
}
