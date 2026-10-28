"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStock } from "@/lib/stock/useStock";
import type { StockItem, StockMovementType } from "@/lib/stock/types";
import StockKpiCards from "@/components/stock/StockKpiCards";
import StockFilterBar from "@/components/stock/StockFilterBar";
import StockTable from "@/components/stock/StockTable";
import AddStockItemModal from "@/components/stock/AddStockItemModal";
import AdjustStockModal from "@/components/stock/AdjustStockModal";
import EditThresholdModal from "@/components/stock/EditThresholdModal";
import MovementsHistoryModal from "@/components/stock/MovementsHistoryModal";

export default function StockPage() {
  const {
    items,
    kpis,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    quickAdjustQuantity,
    updateThreshold,
    getMovements,
  } = useStock();

  // Filters & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NAME_ASC");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<{
    item: StockItem;
    defaultAction?: "IN" | "OUT";
  } | null>(null);
  const [thresholdItem, setThresholdItem] = useState<StockItem | null>(null);
  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Extraire la liste des catégories uniques existantes dans le stock
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.medication.category) {
        set.add(item.medication.category);
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtrage et tri côté client pour réactivité instantanée
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Recherche textuelle
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.medication.name.toLowerCase().includes(q) ||
          i.medication.genericName?.toLowerCase().includes(q) ||
          i.medication.category?.toLowerCase().includes(q) ||
          i.location?.toLowerCase().includes(q) ||
          i.batches.some((b) => b.batchNumber.toLowerCase().includes(q))
      );
    }

    // Filtre catégorie
    if (categoryFilter !== "ALL") {
      result = result.filter((i) => i.medication.category === categoryFilter);
    }

    // Filtre statut
    if (statusFilter === "IN_STOCK") {
      result = result.filter((i) => i.status === "IN_STOCK");
    } else if (statusFilter === "LOW_STOCK") {
      result = result.filter((i) => i.status === "LOW_STOCK");
    } else if (statusFilter === "OUT_OF_STOCK") {
      result = result.filter((i) => i.status === "OUT_OF_STOCK");
    } else if (statusFilter === "EXPIRING") {
      result = result.filter(
        (i) =>
          i.expirationStatus === "EXPIRING_SOON" || i.expirationStatus === "EXPIRED"
      );
    }

    // Tri
    result.sort((a, b) => {
      if (sortBy === "NAME_ASC") {
        return a.medication.name.localeCompare(b.medication.name, "fr");
      }
      if (sortBy === "NAME_DESC") {
        return b.medication.name.localeCompare(a.medication.name, "fr");
      }
      if (sortBy === "QTY_ASC") {
        return a.quantity - b.quantity;
      }
      if (sortBy === "QTY_DESC") {
        return b.quantity - a.quantity;
      }
      if (sortBy === "EXPIRATION") {
        if (!a.nearestExpiration) return 1;
        if (!b.nearestExpiration) return -1;
        return a.nearestExpiration.localeCompare(b.nearestExpiration);
      }
      return 0;
    });

    return result;
  }, [items, searchQuery, statusFilter, categoryFilter, sortBy]);

  const handleDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      await deleteItem(deleteConfirmation.id);
      setDeleteConfirmation(null);
    } catch (e: any) {
      alert(e.message || "Erreur lors de la suppression.");
    }
  };

  return (
    <main className="appointments-page">
      {/* Header */}
      <header className="appointments-header">
        <div>
          <span className="appointments-eyebrow">ESPACE PROFESSIONNEL MÉDECIN</span>
          <h1>Gestion du stock médical</h1>
          <p>
            Suivi des médicaments, seringues, coton, consommables, alertes de rupture et dates de péremption.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/medecin"
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ← Tableau de bord
          </Link>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="btn-prendre-rdv"
          >
            + Nouvel article
          </button>
        </div>
      </header>

      {/* Message d'erreur serveur si existant */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl my-4">
          {error}
        </div>
      )}

      {/* KPIs & Alertes */}
      <StockKpiCards
        kpis={kpis}
        activeFilter={statusFilter}
        onSelectFilter={setStatusFilter}
      />

      {/* Barre de recherche et filtres */}
      <StockFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        categories={categories}
      />

      {/* Liste des articles du stock */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
          <span className="text-3xl block animate-bounce mb-2">📦</span>
          Chargement de votre stock…
        </div>
      ) : (
        <StockTable
          items={filteredItems}
          onOpenAdd={() => setIsAddOpen(true)}
          onOpenAdjust={(item, defaultAction) => setAdjustItem({ item, defaultAction })}
          onOpenThreshold={(item) => setThresholdItem(item)}
          onOpenHistory={(item) => setHistoryItem(item)}
          onDelete={(id, name) => setDeleteConfirmation({ id, name })}
        />
      )}

      {/* Modals */}
      <AddStockItemModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdded={addItem}
      />

      <AdjustStockModal
        isOpen={Boolean(adjustItem)}
        item={adjustItem?.item || null}
        onClose={() => setAdjustItem(null)}
        onAdjust={(id, action, quantity, reason, batchNumber) =>
          quickAdjustQuantity(id, action, quantity, reason, batchNumber)
        }
      />

      <EditThresholdModal
        isOpen={Boolean(thresholdItem)}
        item={thresholdItem}
        onClose={() => setThresholdItem(null)}
        onSave={(id, updates) => updateItem(id, updates)}
      />

      <MovementsHistoryModal
        isOpen={Boolean(historyItem)}
        item={historyItem}
        onClose={() => setHistoryItem(null)}
        getMovements={getMovements}
      />

      {/* Modal Confirmation Suppression */}
      {deleteConfirmation && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-150">
            <span className="text-3xl block mb-2">🗑️</span>
            <h3 className="text-base font-bold text-slate-900">
              Supprimer cet article du stock ?
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Êtes-vous certain de vouloir retirer <strong>{deleteConfirmation.name}</strong> de votre inventaire ? Cette action supprimera également son historique de mouvements.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
