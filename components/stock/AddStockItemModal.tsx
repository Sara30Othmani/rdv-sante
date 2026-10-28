"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";
import type { NewStockItemPayload } from "@/lib/stock/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (payload: NewStockItemPayload) => Promise<unknown>;
};

type CatalogMedication = {
  id: string;
  name: string;
  genericName?: string;
  form?: string;
  dosage?: string;
  category?: string;
  manufacturer?: string;
};

const CATEGORIES = [
  "Consommable",
  "Matériel médical",
  "Antalgique",
  "Antibiotique",
  "Anti-inflammatoire",
  "Antiseptique",
  "Anesthésique",
  "Pansement & Soins",
  "Hygiène & Protection",
  "Autre",
];

const UNITS = [
  "boîte",
  "unité",
  "rouleau",
  "flacon",
  "sachet",
  "ampoule",
  "tube",
  "paquet",
  "paire",
];

export default function AddStockItemModal({ isOpen, onClose, onAdded }: Props) {
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [catalog, setCatalog] = useState<CatalogMedication[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Form fields
  const [selectedMedId, setSelectedMedId] = useState("");
  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [category, setCategory] = useState("Consommable");
  const [form, setForm] = useState("OTHER");
  const [dosage, setDosage] = useState("");
  const [manufacturer, setManufacturer] = useState("");

  const [quantity, setQuantity] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [unit, setUnit] = useState("boîte");
  const [location, setLocation] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingCatalog(true);
      apiJson<CatalogMedication[]>("/api/medications")
        .then((data) => {
          setCatalog(data);
          if (data.length > 0) {
            setSelectedMedId(data[0].id);
          } else {
            setMode("custom");
          }
        })
        .catch(() => {
          setMode("custom");
        })
        .finally(() => {
          setLoadingCatalog(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "catalog") {
        if (!selectedMedId) {
          throw new Error("Veuillez sélectionner un article dans la liste.");
        }
        await onAdded({
          medicationId: selectedMedId,
          quantity: Number(quantity) || 0,
          lowStockThreshold: Number(lowStockThreshold) || 0,
          unit,
          location,
          batchNumber: batchNumber.trim() || undefined,
          expiresAt: expiresAt || undefined,
        });
      } else {
        if (!name.trim()) {
          throw new Error("Le nom de l'article est requis.");
        }
        await onAdded({
          name: name.trim(),
          genericName: genericName.trim() || undefined,
          category,
          form,
          dosage: dosage.trim() || undefined,
          manufacturer: manufacturer.trim() || undefined,
          quantity: Number(quantity) || 0,
          lowStockThreshold: Number(lowStockThreshold) || 0,
          unit,
          location,
          batchNumber: batchNumber.trim() || undefined,
          expiresAt: expiresAt || undefined,
        });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'ajout.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <h2 id="modal-title" className="text-lg font-bold text-slate-800">
              Ajouter un article au stock
            </h2>
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

          {/* Onglets Catalogue vs Nouvel article direct */}
          <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setMode("catalog")}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                mode === "catalog"
                  ? "bg-white text-teal-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              💊 Médicament existant ({catalog.length})
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                mode === "custom"
                  ? "bg-white text-teal-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🩺 Matériel / Consommable / Nouveau
            </button>
          </div>

          {mode === "catalog" ? (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Sélectionner dans le catalogue
              </label>
              {loadingCatalog ? (
                <p className="text-sm text-slate-500">Chargement des médicaments…</p>
              ) : catalog.length === 0 ? (
                <div className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
                  Aucun médicament dans le catalogue. Cliquez sur l&apos;onglet &quot;Matériel / Nouveau&quot; pour en créer un.
                </div>
              ) : (
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-teal-600"
                  required
                >
                  {catalog.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.dosage ? `(${m.dosage})` : ""} - {m.category || "Général"}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom de l&apos;article ou matériel *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Seringues 5ml, Coton hydrophile, Drap d'examen..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 text-sm focus:outline-teal-600"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dosage / Format
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 5ml, 500g, 500 mg, Boîte de 100..."
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Forme
                  </label>
                  <select
                    value={form}
                    onChange={(e) => setForm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 text-sm focus:outline-teal-600"
                  >
                    <option value="OTHER">Autre / Matériel médical</option>
                    <option value="TABLET">Comprimé</option>
                    <option value="CAPSULE">Gélule</option>
                    <option value="SYRUP">Sirop</option>
                    <option value="INJECTION">Injection / Flacon injectable</option>
                    <option value="CREAM">Crème / Pommade</option>
                    <option value="DROPS">Gouttes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fabricant / Marque (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: BD, Hartmann, Sanofi..."
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-teal-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Paramètres de stock */}
          <div className="pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Stock initial &amp; Seuils
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantité initiale *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-teal-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seuil minimal d&apos;alerte *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 bg-amber-50/40 rounded-lg text-slate-800 text-sm focus:outline-amber-600 font-semibold"
                />
                <span className="text-[11px] text-amber-700">Alerte si ≤ seuil</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unité
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 text-sm focus:outline-teal-600"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emplacement dans le cabinet
                </label>
                <input
                  type="text"
                  placeholder="Ex: Armoire A - Étagère 2, Tiroir Soins, Salle d'attente..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Lot & Péremption */}
          <div className="pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Lot &amp; Date de péremption (optionnel)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Numéro de lot
                </label>
                <input
                  type="text"
                  placeholder="Ex: LOT-2026-X1"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date d&apos;expiration
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-teal-600"
                />
              </div>
            </div>
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
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs flex items-center gap-2"
            >
              {submitting ? "Ajout en cours…" : "Ajouter au stock"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
