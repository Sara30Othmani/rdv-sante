import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/auth";
import { fail, json, serverError } from "@/lib/http";
import StockItem from "@/models/StockItem";
import StockMovement from "@/models/StockMovement";
import Medication from "@/models/Medication";

function formatDateFR(date: Date | string | null | undefined): string {
  if (!date) return "Non renseignée";
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * POST /api/stock/assistant
 * Chatbot assistant intelligent pour le stock médical du médecin.
 */
export async function POST(req: Request) {
  const auth = await requireUser(req, ["DOCTOR"]);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const body = await req.json();
    const query = String(body.query || "").trim();

    if (!query) {
      return fail(400, "Veuillez poser une question.");
    }

    await connectDB();

    // Récupération de tous les articles du médecin avec le détail du médicament
    const stockItems = await StockItem.find({ doctorId: user.id })
      .populate("medicationId")
      .lean();

    // Récupération des mouvements de sortie (OUT) pour calculer la consommation
    const movements = await StockMovement.find({
      doctorId: user.id,
      type: "OUT",
    })
      .sort({ createdAt: -1 })
      .lean();

    const qNorm = normalize(query);

    // 1. Détection de demande de rupture / stock bas
    const isRuptureQuery =
      qNorm.includes("rupture") ||
      qNorm.includes("stock bas") ||
      qNorm.includes("manque") ||
      qNorm.includes("reapprovisionner") ||
      qNorm.includes("alerte") ||
      qNorm.includes("epuise");

    // 2. Détection de demande de péremption
    const isPeremptionQuery =
      qNorm.includes("peremption") ||
      qNorm.includes("perime") ||
      qNorm.includes("date") ||
      qNorm.includes("expire") ||
      qNorm.includes("validite");

    // 3. Détection de demande de résumé global
    const isSummaryQuery =
      qNorm.includes("resume") ||
      qNorm.includes("bilan") ||
      qNorm.includes("global") ||
      qNorm.includes("combien d'articles") ||
      qNorm.includes("combien de references") ||
      qNorm.includes("etat du stock") ||
      qNorm.includes("inventaire");

    // 4. Détection de localisation
    const isLocationQuery =
      qNorm.includes("ou se trouve") ||
      qNorm.includes("ou est") ||
      qNorm.includes("ou sont") ||
      qNorm.includes("rangement") ||
      qNorm.includes("emplacement");

    // Helper pour calculer la consommation hebdomadaire d'un article
    const getAvgConsumption = (itemId: string, defaultEstimate = 10) => {
      const itemMovements = movements.filter(
        (m) => String(m.stockItemId) === String(itemId)
      );
      if (itemMovements.length > 0) {
        const totalOut = itemMovements.reduce((sum, m) => sum + (m.quantity || 0), 0);
        // Calcul estimé sur 2 à 4 semaines
        const weeks = Math.max(1, Math.min(4, itemMovements.length));
        return Math.max(1, Math.round(totalOut / weeks));
      }
      return defaultEstimate;
    };

    // Cas A : Recherche d'un produit spécifique dans le stock
    let targetItem: any = null;
    let bestScore = 0;

    for (const item of stockItems) {
      const med: any = item.medicationId;
      if (!med) continue;

      const medNameNorm = normalize(med.name || "");
      const genericNorm = normalize(med.genericName || "");
      const dosageNorm = normalize(med.dosage || "");
      const catNorm = normalize(med.category || "");

      // Score de correspondance
      let score = 0;
      if (qNorm.includes(medNameNorm) && medNameNorm.length > 2) score += 10;
      if (genericNorm && qNorm.includes(genericNorm)) score += 8;

      // Mots-clés pertinents (ex: "seringue", "paracetamol", "coton", "alcool", "drap", "compresse", "amoxicilline")
      const words = medNameNorm.split(/\s+/);
      for (const w of words) {
        if (w.length > 3 && qNorm.includes(w)) {
          score += 4;
        }
      }

      if (dosageNorm && qNorm.includes(dosageNorm)) score += 3;
      if (catNorm && qNorm.includes(catNorm)) score += 2;

      if (score > bestScore) {
        bestScore = score;
        targetItem = item;
      }
    }

    // Si on a identifié un produit spécifique avec un bon score
    if (targetItem && bestScore >= 4 && !isSummaryQuery) {
      const med: any = targetItem.medicationId;
      const unit = targetItem.unit || "unités";
      const qty = targetItem.quantity || 0;
      const threshold = targetItem.lowStockThreshold ?? 5;
      const location = targetItem.location || "Non assigné";

      // Statut
      let statusText = "OK ✅";
      if (qty === 0) {
        statusText = "Rupture critique 🔴";
      } else if (qty <= threshold) {
        statusText = `Stock bas ⚠️ (${qty} restant(s), seuil : ${threshold})`;
      }

      // Prochaine péremption
      const batches = (targetItem.batches || [])
        .filter((b: any) => b.quantity > 0)
        .sort((a: any, b: any) => {
          if (!a.expiresAt) return 1;
          if (!b.expiresAt) return -1;
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        });

      let peremptionStr = "Aucun lot enregistré";
      if (batches.length > 0) {
        const nextBatch = batches[0];
        const expDate = nextBatch.expiresAt ? new Date(nextBatch.expiresAt) : null;
        const isExp = expDate && expDate.getTime() < Date.now();
        const lotNum = nextBatch.batchNumber || "Non spécifié";
        peremptionStr = `Lot #${lotNum} (${nextBatch.quantity} ${unit}${nextBatch.quantity > 1 ? "s" : ""}) — Expire le ${formatDateFR(
          expDate
        )}${isExp ? " (PÉRIMÉ ⚠️)" : ""}`;
      }

      // Consommation estimée
      const avgWeekly = getAvgConsumption(
        String(targetItem._id),
        med.name.toLowerCase().includes("seringue") ? 15 : 8
      );

      // Si c'est juste une demande d'emplacement
      if (isLocationQuery) {
        return json({
          reply: `📍 **Emplacement de ${med.name}** :\n\nCet article est rangé dans : **${location}**.\n\n*Quantité disponible :* **${qty} ${unit}** (Statut : ${statusText}).`,
          item: targetItem,
        });
      }

      // Réponse complète et soignée au format demandé par le cahier des charges
      const titleExtra = med.form === "OTHER" ? "(Consommable / Stérile)" : `(${med.dosage || med.category})`;
      const reply = `📦 **${med.name}** ${titleExtra}

**Quantité en stock :** ${qty} ${unit}${qty > 1 ? "s" : ""}

**Emplacement :** ${location}

**Seuil minimal configuré :** ${threshold} ${unit}${threshold > 1 ? "s" : ""} (Statut : ${statusText})

**Prochaine péremption :** ${peremptionStr}

**Consommation moyenne :** ~${avgWeekly} ${unit}${avgWeekly > 1 ? "s" : ""} / semaine`;

      return json({
        reply,
        item: targetItem,
        suggestions: [
          "Quels sont les articles en rupture ?",
          "Quels produits vont périmer ?",
          "Bilan complet du stock",
        ],
      });
    }

    // Cas B : Demande sur les alertes de stock / ruptures
    if (isRuptureQuery) {
      const outOfStock = stockItems.filter((i) => i.quantity === 0);
      const lowStock = stockItems.filter(
        (i) => i.quantity > 0 && i.quantity <= (i.lowStockThreshold ?? 5)
      );

      if (outOfStock.length === 0 && lowStock.length === 0) {
        return json({
          reply: `✅ **Tous les niveaux de stock sont optimaux !**\n\nAucun produit n'est en rupture ni sous son seuil d'alerte configuré. Vos ${stockItems.length} références sont correctement approvisionnées.`,
        });
      }

      let reply = `⚠️ **Alertes de niveau de stock (${outOfStock.length + lowStock.length} article(s) à surveiller)**\n\n`;

      if (outOfStock.length > 0) {
        reply += `🚨 **En rupture critique (0 unité) :**\n`;
        outOfStock.forEach((i) => {
          const m: any = i.medicationId;
          reply += `• **${m?.name || "Article"}** : 0 ${i.unit} (Seuil requis : ${i.lowStockThreshold} ${i.unit}) — *Rangement : ${i.location || "N/A"}*\n`;
        });
        reply += `\n`;
      }

      if (lowStock.length > 0) {
        reply += `🟠 **Stock bas (Sous le seuil minimal) :**\n`;
        lowStock.forEach((i) => {
          const m: any = i.medicationId;
          reply += `• **${m?.name || "Article"}** : reste **${i.quantity} ${i.unit}** (Seuil : ${i.lowStockThreshold} ${i.unit}) — *Rangement : ${i.location || "N/A"}*\n`;
        });
      }

      reply += `\n💡 *Conseil : Vous pouvez cliquer sur « Réapprovisionner » directement dans le tableau pour enregistrer une entrée.*`;

      return json({
        reply,
        suggestions: [
          "Donnes-moi toutes les infos sur les seringues 5ml en stock",
          "Quels produits vont bientôt périmer ?",
          "Fais-moi un résumé du stock",
        ],
      });
    }

    // Cas C : Demande sur les dates de péremption
    if (isPeremptionQuery) {
      const nowMs = Date.now();
      const in90DaysMs = nowMs + 90 * 24 * 60 * 60 * 1000;

      const expiredList: Array<{ name: string; batch: any; location: string }> = [];
      const soonList: Array<{ name: string; batch: any; location: string; daysLeft: number }> = [];

      for (const item of stockItems) {
        const m: any = item.medicationId;
        const medName = m?.name || "Article";
        for (const b of item.batches || []) {
          if (!b.expiresAt || b.quantity <= 0) continue;
          const expMs = new Date(b.expiresAt).getTime();
          if (expMs < nowMs) {
            expiredList.push({ name: medName, batch: b, location: item.location || "N/A" });
          } else if (expMs <= in90DaysMs) {
            const daysLeft = Math.ceil((expMs - nowMs) / (24 * 60 * 60 * 1000));
            soonList.push({ name: medName, batch: b, location: item.location || "N/A", daysLeft });
          }
        }
      }

      let reply = `⏳ **État des dates de péremption des lots en stock**\n\n`;

      if (expiredList.length > 0) {
        reply += `🚨 **Lots déjà périmés à retirer du cabinet :**\n`;
        expiredList.forEach((e) => {
          reply += `• **${e.name}** — Lot #${e.batch.batchNumber} (${e.batch.quantity} unités) : périmé le ${formatDateFR(
            e.batch.expiresAt
          )} — *Emplacement : ${e.location}*\n`;
        });
        reply += `\n`;
      }

      if (soonList.length > 0) {
        reply += `⚠️ **Lots expirant dans les 90 prochains jours :**\n`;
        soonList
          .sort((a, b) => a.daysLeft - b.daysLeft)
          .forEach((s) => {
            reply += `• **${s.name}** — Lot #${s.batch.batchNumber} (${s.batch.quantity} unités) : expire le ${formatDateFR(
              s.batch.expiresAt
            )} (dans ~${s.daysLeft} jours) — *Emplacement : ${s.location}*\n`;
          });
      }

      if (expiredList.length === 0 && soonList.length === 0) {
        reply += `✅ **Aucun produit périmé ni proche de péremption dans les 90 prochains jours.** Tous les lots enregistrés sont en parfaite validité.`;
      }

      return json({
        reply,
        suggestions: [
          "Quels sont les articles en rupture ?",
          "Donnes-moi toutes les infos sur les seringues 5ml en stock",
          "Résumé global de l'inventaire",
        ],
      });
    }

    // Cas D : Résumé global / bilan d'inventaire
    if (isSummaryQuery) {
      const totalRefs = stockItems.length;
      const totalUnits = stockItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
      const outOfStockCount = stockItems.filter((i) => i.quantity === 0).length;
      const lowStockCount = stockItems.filter(
        (i) => i.quantity > 0 && i.quantity <= (i.lowStockThreshold ?? 5)
      ).length;

      const reply = `📊 **Bilan synthétique du stock médical du cabinet**

• **Nombre total de références :** ${totalRefs} articles enregistrés
• **Quantité totale cumulée :** ${totalUnits} unités en inventaire
• **Ruptures critiques :** ${outOfStockCount > 0 ? `🚨 ${outOfStockCount} produit(s)` : "✅ 0"}
• **Articles en stock bas :** ${lowStockCount > 0 ? `⚠️ ${lowStockCount} produit(s)` : "✅ 0"}

🔍 **Points de vigilance rapides :**
${
  outOfStockCount > 0 || lowStockCount > 0
    ? `Il y a ${outOfStockCount + lowStockCount} article(s) nécessitant une attention ou commande fournisseur.`
    : "Le stock médical est parfaitement équilibré."
}

*Vous pouvez me poser une question précise, par exemple : « Donnes-moi toutes les infos sur les seringues 5ml en stock » ou « Quels produits vont bientôt périmer ? ».*`;

      return json({
        reply,
        suggestions: [
          "Donnes-moi toutes les infos sur les seringues 5ml en stock",
          "Quels sont les articles en rupture ?",
          "Quels produits vont bientôt périmer ?",
        ],
      });
    }

    // Cas E : Si l'utilisateur pose une question libre non reconnue
    const availableNames = stockItems
      .map((i) => {
        const m: any = i.medicationId;
        return m?.name;
      })
      .filter(Boolean)
      .slice(0, 5)
      .join(", ");

    return json({
      reply: `🤖 Je n'ai pas trouvé d'article correspondant exactement à votre recherche « *${query}* » dans le stock du cabinet.

💡 **Vous pouvez me demander par exemple :**
• « *Donnes-moi toutes les infos sur les seringues 5ml en stock.* »
• « *Quels sont les articles en rupture ou en stock bas ?* »
• « *Quels produits vont bientôt périmer ?* »
• « *Où se trouve le Paracétamol ?* »
• « *Fais-moi un résumé global du stock.* »

📦 **Exemples d'articles actuellement enregistrés :** ${availableNames || "Seringues 5ml, Paracétamol, Amoxicilline, Coton..."}.`,
      suggestions: [
        "Donnes-moi toutes les infos sur les seringues 5ml en stock",
        "Quels sont les articles en rupture ?",
        "Quels produits vont bientôt périmer ?",
        "Fais-moi un résumé du stock",
      ],
    });
  } catch (e) {
    return serverError(e);
  }
}
