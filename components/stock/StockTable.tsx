"use client";

import type { StockItem } from "@/lib/stock/types";

type Props = {
  items: StockItem[];
  onOpenAdd: () => void;
  onOpenAdjust: (item: StockItem, defaultAction?: "IN" | "OUT") => void;
  onOpenThreshold: (item: StockItem) => void;
  onOpenHistory: (item: StockItem) => void;
  onDelete: (id: string, name: string) => void;
};

function formatExpDate(dateStr?: string | null) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function StockTable({
  items,
  onOpenAdd,
  onOpenAdjust,
  onOpenThreshold,
  onOpenHistory,
  onDelete,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <span className="text-4xl block mb-3">📦</span>
        <h3 className="text-lg font-bold text-slate-800">Aucun article trouvé</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
          Votre stock ne contient aucun article correspondant aux critères sélectionnés, ou vous n&apos;avez pas encore ajouté de matériel médical ni de médicaments.
        </p>
        <button
          type="button"
          onClick={onOpenAdd}
          className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl text-sm transition-colors shadow-xs"
        >
          + Ajouter un article au stock
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Article &amp; Catégorie</th>
              <th className="py-3 px-4">Emplacement</th>
              <th className="py-3 px-4">Stock actuel</th>
              <th className="py-3 px-4">Seuil minimal</th>
              <th className="py-3 px-4">État &amp; Péremption</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const isOutOfStock = item.status === "OUT_OF_STOCK";
              const isLowStock = item.status === "LOW_STOCK";
              const isExpired = item.expirationStatus === "EXPIRED";
              const isExpiringSoon = item.expirationStatus === "EXPIRING_SOON";

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isOutOfStock ? "bg-red-50/20" : isLowStock ? "bg-amber-50/15" : ""
                  }`}
                >
                  {/* Article & Catégorie */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{item.medication.name}</span>
                      {item.medication.dosage && (
                        <span className="text-xs font-normal text-slate-500">
                          ({item.medication.dosage})
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-500">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {item.medication.category || "Général"}
                      </span>
                      {item.medication.manufacturer && (
                        <span className="text-slate-400">· {item.medication.manufacturer}</span>
                      )}
                    </div>
                  </td>

                  {/* Emplacement */}
                  <td className="py-3.5 px-4 text-slate-600">
                    {item.location ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100/80 px-2 py-1 rounded-md">
                        📍 {item.location}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Non spécifié</span>
                    )}
                  </td>

                  {/* Stock actuel */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`text-base font-bold ${
                          isOutOfStock
                            ? "text-red-600"
                            : isLowStock
                            ? "text-amber-700"
                            : "text-slate-900"
                        }`}
                      >
                        {item.quantity}
                      </span>
                      <span className="text-xs text-slate-500">
                        {item.unit}
                        {item.quantity > 1 ? "s" : ""}
                      </span>
                    </div>
                  </td>

                  {/* Seuil minimal */}
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => onOpenThreshold(item)}
                      title="Modifier le seuil minimal d'alerte"
                      className="group inline-flex items-center gap-1 text-xs text-slate-600 hover:text-teal-700 font-medium py-0.5 px-1.5 rounded hover:bg-slate-100 transition-colors"
                    >
                      <span>
                        ≤ {item.lowStockThreshold} {item.unit}
                        {item.lowStockThreshold > 1 ? "s" : ""}
                      </span>
                      <span className="opacity-0 group-hover:opacity-100 text-slate-400">✏️</span>
                    </button>
                  </td>

                  {/* État & Péremption */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      {/* Badge état du stock */}
                      <div>
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                            ⛔ Rupture
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            ⚠️ Stock faible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            🟢 En stock
                          </span>
                        )}
                      </div>

                      {/* Info péremption */}
                      {item.nearestExpiration && (
                        <div className="text-[11px]">
                          {isExpired ? (
                            <span className="text-red-700 font-bold">
                              🚨 Périmé le {formatExpDate(item.nearestExpiration)}
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="text-orange-700 font-semibold">
                              ⏳ Expire le {formatExpDate(item.nearestExpiration)}
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Exp: {formatExpDate(item.nearestExpiration)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      {/* Entrée rapide + */}
                      <button
                        type="button"
                        onClick={() => onOpenAdjust(item, "IN")}
                        title="Ajouter au stock (+)"
                        className="p-1.5 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-colors text-xs font-bold"
                      >
                        + Entrée
                      </button>

                      {/* Sortie rapide - */}
                      <button
                        type="button"
                        onClick={() => onOpenAdjust(item, "OUT")}
                        disabled={isOutOfStock}
                        title="Sortie de stock (-)"
                        className="p-1.5 rounded-lg border border-amber-300 text-amber-900 hover:bg-amber-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors text-xs font-bold"
                      >
                        - Sortie
                      </button>

                      {/* Historique */}
                      <button
                        type="button"
                        onClick={() => onOpenHistory(item)}
                        title="Historique des mouvements"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors text-xs"
                      >
                        📜
                      </button>

                      {/* Paramètres / Seuil */}
                      <button
                        type="button"
                        onClick={() => onOpenThreshold(item)}
                        title="Modifier paramètres & seuil"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors text-xs"
                      >
                        ⚙️
                      </button>

                      {/* Supprimer */}
                      <button
                        type="button"
                        onClick={() => onDelete(item.id, item.medication.name)}
                        title="Supprimer du stock"
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
