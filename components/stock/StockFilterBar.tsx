"use client";

type Props = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  categories: string[];
};

export default function StockFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  sortBy,
  onSortChange,
  categories,
}: Props) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 mb-6">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Champ de recherche */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Rechercher par nom (ex. seringues, coton, paracétamol), lot, lieu..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-teal-600 focus:border-teal-600 bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs rounded-full p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtre par catégorie */}
        <div className="w-full sm:w-48">
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-teal-600"
          >
            <option value="ALL">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Tri */}
        <div className="w-full sm:w-48">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-teal-600"
          >
            <option value="NAME_ASC">Nom (A → Z)</option>
            <option value="NAME_DESC">Nom (Z → A)</option>
            <option value="QTY_ASC">Quantité (croissante)</option>
            <option value="QTY_DESC">Quantité (décroissante)</option>
            <option value="EXPIRATION">Date d&apos;expiration proche</option>
          </select>
        </div>
      </div>

      {/* Onglets / Badges de statut rapide */}
      <div className="flex items-center gap-2 overflow-x-auto pt-1 text-xs">
        <span className="text-slate-500 font-semibold whitespace-nowrap mr-1">Filtrer par état :</span>
        <button
          type="button"
          onClick={() => onStatusFilterChange("ALL")}
          className={`px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
            statusFilter === "ALL"
              ? "bg-slate-800 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Tous les articles
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("IN_STOCK")}
          className={`px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
            statusFilter === "IN_STOCK"
              ? "bg-emerald-700 text-white"
              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          }`}
        >
          🟢 En stock normal
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("LOW_STOCK")}
          className={`px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
            statusFilter === "LOW_STOCK"
              ? "bg-amber-700 text-white"
              : "bg-amber-50 text-amber-900 hover:bg-amber-100"
          }`}
        >
          🟡 Stock faible
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("OUT_OF_STOCK")}
          className={`px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
            statusFilter === "OUT_OF_STOCK"
              ? "bg-red-700 text-white"
              : "bg-red-50 text-red-800 hover:bg-red-100"
          }`}
        >
          🔴 Rupture de stock
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("EXPIRING")}
          className={`px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
            statusFilter === "EXPIRING"
              ? "bg-orange-700 text-white"
              : "bg-orange-50 text-orange-900 hover:bg-orange-100"
          }`}
        >
          ⏳ Proche expiration / Périmé
        </button>
      </div>
    </div>
  );
}
