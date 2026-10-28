"use client";

import { useEffect, useState } from "react";
import type { StockItem, StockMovement } from "@/lib/stock/types";

type Props = {
  isOpen: boolean;
  item: StockItem | null;
  onClose: () => void;
  getMovements: (id: string) => Promise<StockMovement[]>;
};

function formatMovementDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function MovementsHistoryModal({
  isOpen,
  item,
  onClose,
  getMovements,
}: Props) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      setError(null);
      getMovements(item.id)
        .then((data) => setMovements(data))
        .catch((e: any) => setError(e.message || "Erreur de chargement de l'historique."))
        .finally(() => setLoading(false));
    }
  }, [isOpen, item, getMovements]);

  if (!isOpen || !item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="history-modal-title" className="text-lg font-bold text-slate-800">
              Historique des mouvements
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

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Chargement des mouvements…
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              {error}
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Aucun mouvement enregistré pour cet article.
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {movements.map((m) => {
                const isPositive = m.type === "IN";
                const isOut = m.type === "OUT" || m.type === "EXPIRED";
                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">
                        {m.type === "IN"
                          ? "📥"
                          : m.type === "OUT"
                          ? "📤"
                          : m.type === "EXPIRED"
                          ? "⚠️"
                          : "⚖️"}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-800 text-xs uppercase font-bold tracking-wider">
                            {m.type === "IN"
                              ? "Entrée de stock"
                              : m.type === "OUT"
                              ? "Sortie / Soin"
                              : m.type === "EXPIRED"
                              ? "Mise au rebut (Périmé)"
                              : "Ajustement inventaire"}
                          </strong>
                          {m.batchNumber && (
                            <span className="text-[11px] bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded">
                              Lot: {m.batchNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {m.reason || "Aucun motif spécifié"}
                        </p>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          {formatMovementDate(m.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <span
                        className={`text-sm font-bold ${
                          isPositive
                            ? "text-emerald-700"
                            : isOut
                            ? "text-amber-800"
                            : "text-blue-700"
                        }`}
                      >
                        {isPositive ? "+" : isOut ? "-" : "±"}
                        {m.quantity} {item.unit}
                        {m.quantity > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm font-semibold transition-colors"
          >
            Fermer
          </button>
        </footer>
      </div>
    </div>
  );
}
