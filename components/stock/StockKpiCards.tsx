"use client";

import type { StockKpis } from "@/lib/stock/types";

type Props = {
  kpis: StockKpis;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
};

export default function StockKpiCards({ kpis, activeFilter, onSelectFilter }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
      {/* 1. Total Articles */}
      <button
        type="button"
        onClick={() => onSelectFilter("ALL")}
        className={`text-left p-4 rounded-xl border transition-all ${
          activeFilter === "ALL"
            ? "border-teal-600 bg-teal-50/70 shadow-sm ring-2 ring-teal-500/20"
            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
        }`}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
          Total Références
        </span>
        <strong className="text-2xl font-bold text-teal-800 block my-1">
          {kpis.totalItems}
        </strong>
        <span className="text-xs text-slate-500 block">
          {kpis.totalQuantity} unités au total
        </span>
      </button>

      {/* 2. Stock faible */}
      <button
        type="button"
        onClick={() => onSelectFilter("LOW_STOCK")}
        className={`text-left p-4 rounded-xl border transition-all ${
          activeFilter === "LOW_STOCK"
            ? "border-amber-600 bg-amber-50 shadow-sm ring-2 ring-amber-500/20"
            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Stock faible
          </span>
          <span className="text-sm">⚠️</span>
        </div>
        <strong
          className={`text-2xl font-bold block my-1 ${
            kpis.lowStockCount > 0 ? "text-amber-800" : "text-slate-700"
          }`}
        >
          {kpis.lowStockCount}
        </strong>
        <span className="text-xs text-slate-500 block">
          {kpis.lowStockCount > 0
            ? "Quantité ≤ seuil minimal"
            : "Aucune alerte de stock"}
        </span>
      </button>

      {/* 3. Ruptures de stock */}
      <button
        type="button"
        onClick={() => onSelectFilter("OUT_OF_STOCK")}
        className={`text-left p-4 rounded-xl border transition-all ${
          activeFilter === "OUT_OF_STOCK"
            ? "border-red-600 bg-red-50 shadow-sm ring-2 ring-red-500/20"
            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ruptures de stock
          </span>
          <span className="text-sm">⛔</span>
        </div>
        <strong
          className={`text-2xl font-bold block my-1 ${
            kpis.outOfStockCount > 0 ? "text-red-700" : "text-slate-700"
          }`}
        >
          {kpis.outOfStockCount}
        </strong>
        <span className="text-xs text-slate-500 block">
          {kpis.outOfStockCount > 0
            ? "Quantité épuisée (0)"
            : "Aucune rupture"}
        </span>
      </button>

      {/* 4. Alertes péremption */}
      <button
        type="button"
        onClick={() => onSelectFilter("EXPIRING")}
        className={`text-left p-4 rounded-xl border transition-all ${
          activeFilter === "EXPIRING"
            ? "border-orange-600 bg-orange-50 shadow-sm ring-2 ring-orange-500/20"
            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Péremption
          </span>
          <span className="text-sm">⏳</span>
        </div>
        <strong
          className={`text-2xl font-bold block my-1 ${
            kpis.expiredCount > 0
              ? "text-red-700"
              : kpis.expiringCount > 0
              ? "text-orange-700"
              : "text-emerald-700"
          }`}
        >
          {kpis.expiringCount}
        </strong>
        <span className="text-xs text-slate-500 block">
          {kpis.expiredCount > 0
            ? `${kpis.expiredCount} périmé(s) !`
            : kpis.expiringCount > 0
            ? "Expire dans < 30 j"
            : "Tous les lots à jour"}
        </span>
      </button>
    </div>
  );
}
