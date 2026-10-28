"use client";

import { useEffect, useState } from "react";
import type { StockItem } from "@/lib/stock/types";

type Props = {
  isOpen: boolean;
  item: StockItem | null;
  onClose: () => void;
  onSave: (id: string, updates: { lowStockThreshold?: number; location?: string; unit?: string }) => Promise<unknown>;
};

export default function EditThresholdModal({ isOpen, item, onClose, onSave }: Props) {
  const [threshold, setThreshold] = useState<number>(5);
  const [location, setLocation] = useState("");
  const [unit, setUnit] = useState("boîte");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setThreshold(item.lowStockThreshold);
      setLocation(item.location || "");
      setUnit(item.unit || "boîte");
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSave(item.id, {
        lowStockThreshold: Math.max(0, Number(threshold)),
        location: location.trim(),
        unit: unit.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour des paramètres.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="threshold-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="threshold-modal-title" className="text-lg font-bold text-slate-800">
              Paramètres &amp; Seuil minimal
            </h2>
            <p className="text-xs text-slate-500">{item.medication.name}</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Seuil minimal d&apos;alerte *
            </label>
            <input
              type="number"
              min="0"
              required
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 border border-amber-300 bg-amber-50/40 rounded-lg text-slate-800 text-base font-bold focus:outline-amber-600"
            />
            <p className="text-xs text-slate-500 mt-1">
              Une alerte &quot;Stock faible&quot; sera déclenchée dès que la quantité disponible
              sera inférieure ou égale à ce seuil.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Emplacement dans le cabinet
            </label>
            <input
              type="text"
              placeholder="Ex: Armoire Pharmacie, Étagère B, Tiroir 1..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Unité de mesure
            </label>
            <input
              type="text"
              placeholder="Ex: boîte, rouleau, flacon, seringue, unité..."
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-teal-600"
            />
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
              {submitting ? "Enregistrement…" : "Enregistrer le seuil"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
