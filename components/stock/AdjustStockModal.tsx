"use client";

import { useState } from "react";
import type { StockItem, StockMovementType } from "@/lib/stock/types";

type Props = {
  isOpen: boolean;
  item: StockItem | null;
  onClose: () => void;
  onAdjust: (
    id: string,
    action: StockMovementType,
    quantity: number,
    reason?: string,
    batchNumber?: string
  ) => Promise<unknown>;
};

export default function AdjustStockModal({ isOpen, item, onClose, onAdjust }: Props) {
  const [action, setAction] = useState<StockMovementType>("IN");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  // Calcul du stock projeté
  const currentQty = item.quantity;
  let nextQty = currentQty;
  if (action === "IN") nextQty = currentQty + (Number(quantity) || 0);
  else if (action === "OUT" || action === "EXPIRED")
    nextQty = Math.max(0, currentQty - (Number(quantity) || 0));
  else if (action === "ADJUSTMENT") nextQty = Math.max(0, Number(quantity) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError("Veuillez saisir une quantité positive.");
      return;
    }

    if ((action === "OUT" || action === "EXPIRED") && qty > currentQty) {
      setError(
        `Impossible de retirer ${qty} ${item.unit}(s) : le stock actuel est de ${currentQty}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await onAdjust(item.id, action, qty, reason.trim() || undefined, batchNumber.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la modification de la quantité.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="adjust-modal-title" className="text-lg font-bold text-slate-800">
              Modifier la quantité
            </h2>
            <p className="text-xs text-slate-500">
              {item.medication.name}{" "}
              {item.medication.dosage ? `(${item.medication.dosage})` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 text-lg leading-none"
            aria-label="Fermer"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* État actuel du stock */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-sm">
            <div>
              <span className="text-slate-500 block text-xs">Stock actuel</span>
              <strong className="text-lg text-slate-800">
                {currentQty} {item.unit}
                {currentQty > 1 ? "s" : ""}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-xs">Seuil minimal</span>
              <span className="text-amber-800 font-semibold">
                {item.lowStockThreshold} {item.unit}
                {item.lowStockThreshold > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Type d'opération */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Type de mouvement
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setAction("IN")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  action === "IN"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-xs"
                    : "border-slate-200 hover:border-slate-300 text-slate-700 text-xs"
                }`}
              >
                <span className="text-base block">📥</span>
                <span className="text-xs">Entrée (+ Stock)</span>
              </button>

              <button
                type="button"
                onClick={() => setAction("OUT")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  action === "OUT"
                    ? "border-amber-600 bg-amber-50 text-amber-900 font-bold shadow-xs"
                    : "border-slate-200 hover:border-slate-300 text-slate-700 text-xs"
                }`}
              >
                <span className="text-base block">📤</span>
                <span className="text-xs">Sortie (Soin)</span>
              </button>

              <button
                type="button"
                onClick={() => setAction("ADJUSTMENT")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  action === "ADJUSTMENT"
                    ? "border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs"
                    : "border-slate-200 hover:border-slate-300 text-slate-700 text-xs"
                }`}
              >
                <span className="text-base block">⚖️</span>
                <span className="text-xs">Inventaire exact</span>
              </button>

              <button
                type="button"
                onClick={() => setAction("EXPIRED")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  action === "EXPIRED"
                    ? "border-red-600 bg-red-50 text-red-900 font-bold shadow-xs"
                    : "border-slate-200 hover:border-slate-300 text-slate-700 text-xs"
                }`}
              >
                <span className="text-base block">⚠️</span>
                <span className="text-xs">Rebut / Périmé</span>
              </button>
            </div>
          </div>

          {/* Quantité & Lot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {action === "ADJUSTMENT" ? "Nouvelle quantité totale" : "Quantité du mouvement"} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-base font-bold focus:outline-teal-600"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">
                  {item.unit}(s)
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Numéro de lot (optionnel)
              </label>
              {item.batches && item.batches.length > 0 ? (
                <select
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 text-sm focus:outline-teal-600"
                >
                  <option value="">Sélectionner un lot…</option>
                  {item.batches.map((b) => (
                    <option key={b.batchNumber} value={b.batchNumber}>
                      {b.batchNumber} ({b.quantity} {item.unit}s)
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ex: LOT-2026-01"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-teal-600"
                />
              )}
            </div>
          </div>

          {/* Motif */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motif du mouvement
            </label>
            <input
              type="text"
              placeholder={
                action === "IN"
                  ? "Ex: Réapprovisionnement pharmacie centrale"
                  : action === "OUT"
                  ? "Ex: Utilisé en consultation"
                  : action === "EXPIRED"
                  ? "Ex: Date limite dépassée"
                  : "Ex: Ajustement suite à l'inventaire"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-teal-600"
            />
          </div>

          {/* Aperçu du stock après validation */}
          <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl flex items-center justify-between text-sm">
            <span className="text-teal-900 font-medium">Stock après opération :</span>
            <strong className="text-base text-teal-800">
              {nextQty} {item.unit}
              {nextQty > 1 ? "s" : ""}{" "}
              {nextQty === 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                  Rupture
                </span>
              )}
              {nextQty > 0 && nextQty <= item.lowStockThreshold && (
                <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  Stock faible
                </span>
              )}
            </strong>
          </div>

          <footer className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs"
            >
              {submitting ? "Enregistrement…" : "Confirmer le mouvement"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
