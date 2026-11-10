"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/api";

type Medication = {
  id: string;
  name: string;
  genericName?: string;
  form: string;
  dosage?: string;
  category?: string;
  manufacturer?: string;
  requiresPrescription: boolean;
  contraindications?: string[];
  sideEffects?: string[];
  createdAt?: string;
};

const FORM_OPTIONS = [
  { value: "TABLET", label: "Comprimé" },
  { value: "CAPSULE", label: "Gélule" },
  { value: "SYRUP", label: "Sirop" },
  { value: "INJECTION", label: "Injection" },
  { value: "CREAM", label: "Crème / Pommade" },
  { value: "DROPS", label: "Gouttes" },
  { value: "OTHER", label: "Autre / Consommable" },
];

export default function MedicamentsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres & Recherche
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [consultMed, setConsultMed] = useState<Medication | null>(null);
  const [editMed, setEditMed] = useState<Medication | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Medication | null>(null);

  // Formulaire state (Ajout / Modification)
  const [formName, setFormName] = useState("");
  const [formGeneric, setFormGeneric] = useState("");
  const [formForm, setFormForm] = useState("TABLET");
  const [formDosage, setFormDosage] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formManufacturer, setFormManufacturer] = useState("");
  const [formRequiresPrescription, setFormRequiresPrescription] = useState(false);
  const [formContraindications, setFormContraindications] = useState("");
  const [formSideEffects, setFormSideEffects] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<Medication[]>("/api/medications");
      setMedications(data);
    } catch (err: any) {
      setError(err.message || "Impossible de charger le catalogue de médicaments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extraire les catégories uniques
  const categories = useMemo(() => {
    const set = new Set<string>();
    medications.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set).sort();
  }, [medications]);

  // Filtrage local pour réactivité maximale
  const filtered = useMemo(() => {
    return medications.filter((m) => {
      const matchesSearch =
        !search.trim() ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.genericName?.toLowerCase().includes(search.toLowerCase()) ||
        m.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
        m.category?.toLowerCase().includes(search.toLowerCase());

      const matchesCat =
        selectedCategory === "ALL" || m.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [medications, search, selectedCategory]);

  const openAddModal = () => {
    setFormName("");
    setFormGeneric("");
    setFormForm("TABLET");
    setFormDosage("");
    setFormCategory("");
    setFormManufacturer("");
    setFormRequiresPrescription(false);
    setFormContraindications("");
    setFormSideEffects("");
    setFormError("");
    setIsAddOpen(true);
  };

  const openEditModal = (m: Medication) => {
    setEditMed(m);
    setFormName(m.name);
    setFormGeneric(m.genericName || "");
    setFormForm(m.form || "TABLET");
    setFormDosage(m.dosage || "");
    setFormCategory(m.category || "");
    setFormManufacturer(m.manufacturer || "");
    setFormRequiresPrescription(Boolean(m.requiresPrescription));
    setFormContraindications((m.contraindications || []).join("\n"));
    setFormSideEffects((m.sideEffects || []).join("\n"));
    setFormError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Le nom du médicament est requis.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await apiJson("/api/medications", {
        method: "POST",
        body: JSON.stringify({
          name: formName.trim(),
          genericName: formGeneric.trim() || undefined,
          form: formForm,
          dosage: formDosage.trim() || undefined,
          category: formCategory.trim() || "Général",
          manufacturer: formManufacturer.trim() || undefined,
          requiresPrescription: formRequiresPrescription,
          contraindications: formContraindications,
          sideEffects: formSideEffects,
        }),
      });
      setIsAddOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la création du médicament.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMed || !formName.trim()) {
      setFormError("Le nom du médicament est requis.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await apiJson(`/api/medications/${editMed.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formName.trim(),
          genericName: formGeneric.trim() || undefined,
          form: formForm,
          dosage: formDosage.trim() || undefined,
          category: formCategory.trim() || "Général",
          manufacturer: formManufacturer.trim() || undefined,
          requiresPrescription: formRequiresPrescription,
          contraindications: formContraindications,
          sideEffects: formSideEffects,
        }),
      });
      setEditMed(null);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la modification du médicament.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      await apiJson(`/api/medications/${deleteConfirm.id}`, {
        method: "DELETE",
      });
      setDeleteConfirm(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression.");
    } finally {
      setSaving(false);
    }
  };

  const formatForm = (val: string) => {
    const found = FORM_OPTIONS.find((f) => f.value === val);
    return found ? found.label : val;
  };

  return (
    <main className="appointments-page">
      {/* Header */}
      <header className="appointments-header">
        <div>
          <span className="appointments-eyebrow">ESPACE PROFESSIONNEL MÉDECIN</span>
          <h1>Gestion des médicaments</h1>
          <p>
            Catalogue partagé des spécialités pharmaceutiques, posologies, formes galéniques et contre-indications.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/medecin/ordonnances"
            className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <span>📄</span>
            <span>Ordonnances délivrées</span>
          </Link>
          <button
            type="button"
            onClick={openAddModal}
            className="btn-prendre-rdv flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Nouveau médicament</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl my-4">
          {error}
        </div>
      )}

      {/* Barre de recherche et de filtrage */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, DCI, catégorie ou laboratoire..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtre par catégorie */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-600 shrink-0">Catégorie :</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium text-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
          >
            <option value="ALL">Toutes les catégories ({medications.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des médicaments */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
          <span className="text-3xl block animate-bounce mb-2">💊</span>
          Chargement du catalogue des médicaments…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          <p className="font-semibold text-slate-700 mb-1">Aucun médicament trouvé</p>
          <p className="text-xs text-slate-500 mb-4">
            Modifiez votre recherche ou ajoutez un nouveau médicament au catalogue.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="btn-prendre-rdv text-xs"
          >
            + Ajouter un médicament
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Médicament</th>
                  <th className="py-3 px-4">DCI / Générique</th>
                  <th className="py-3 px-4">Forme &amp; Dosage</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Laboratoire</th>
                  <th className="py-3 px-4">Prescription</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {m.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {m.genericName || "–"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 font-medium text-[11px]">
                        {formatForm(m.form)}
                      </span>{" "}
                      {m.dosage && <span className="font-semibold text-slate-900">· {m.dosage}</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                        {m.category || "Général"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {m.manufacturer || "–"}
                    </td>
                    <td className="py-3.5 px-4">
                      {m.requiresPrescription ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          <span>⚕️</span> Obligatoire
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Libre</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConsultMed(m)}
                          title="Consulter la fiche"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 text-xs font-semibold transition-colors"
                        >
                          👁️ Consulter
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(m)}
                          title="Modifier le médicament"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(m)}
                          title="Supprimer du catalogue"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>
              Affichage de <strong>{filtered.length}</strong> médicament(s) sur un total de {medications.length}.
            </span>
          </div>
        </div>
      )}

      {/* Modal Consulter un médicament */}
      {consultMed && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="flex flex-col w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-teal-800 text-white">
              <div className="flex items-center gap-2">
                <span className="text-xl">💊</span>
                <h3 className="font-bold text-base">Fiche Technique Médicament</h3>
              </div>
              <button
                type="button"
                onClick={() => setConsultMed(null)}
                className="p-1.5 text-teal-200 hover:text-white rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Désignation Commerciale
                </span>
                <h2 className="text-lg font-bold text-slate-900">{consultMed.name}</h2>
                {consultMed.genericName && (
                  <p className="text-slate-500 italic mt-0.5">DCI : {consultMed.genericName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl">
                <div>
                  <span className="text-slate-400 block font-medium">Forme galénique</span>
                  <strong className="text-slate-800">{formatForm(consultMed.form)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Dosage</span>
                  <strong className="text-slate-800">{consultMed.dosage || "Non spécifié"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Catégorie</span>
                  <strong className="text-teal-800">{consultMed.category || "Général"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Laboratoire</span>
                  <strong className="text-slate-800">{consultMed.manufacturer || "Non renseigné"}</strong>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">
                  Conditions de délivrance
                </span>
                <p className="text-slate-700">
                  {consultMed.requiresPrescription
                    ? "⚕️ Médicament soumis à prescription médicale obligatoire (Liste I ou II)."
                    : "✅ Délivrance libre sans ordonnance requise."}
                </p>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">
                  Contre-indications répertoriées
                </span>
                {consultMed.contraindications && consultMed.contraindications.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-slate-700 bg-red-50/60 p-3 rounded-xl border border-red-100">
                    {consultMed.contraindications.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 italic">Aucune contre-indication spécifique enregistrée.</p>
                )}
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">
                  Effets indésirables connus
                </span>
                {consultMed.sideEffects && consultMed.sideEffects.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-slate-700 bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                    {consultMed.sideEffects.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 italic">Aucun effet secondaire notable documenté.</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setConsultMed(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter un médicament */}
      {isAddOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="flex flex-col w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-teal-700 text-white">
              <h3 className="font-bold text-base">Ajouter un médicament au catalogue</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 text-teal-200 hover:text-white rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nom commercial du médicament *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Doliprane, Augmentin, Voltarène..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dénomination Commune (DCI)
                  </label>
                  <input
                    type="text"
                    value={formGeneric}
                    onChange={(e) => setFormGeneric(e.target.value)}
                    placeholder="Ex: Paracétamol, Amoxicilline..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dosage
                  </label>
                  <input
                    type="text"
                    value={formDosage}
                    onChange={(e) => setFormDosage(e.target.value)}
                    placeholder="Ex: 500 mg, 1 g, 200 ml..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Forme galénique
                  </label>
                  <select
                    value={formForm}
                    onChange={(e) => setFormForm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {FORM_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Catégorie thérapeutique
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Ex: Antalgique, Antibiotique..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fabricant / Laboratoire pharmaceutique
                </label>
                <input
                  type="text"
                  value={formManufacturer}
                  onChange={(e) => setFormManufacturer(e.target.value)}
                  placeholder="Ex: Sanofi, Pfizer, Biogaran, UPSA..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="requiresRxAdd"
                  checked={formRequiresPrescription}
                  onChange={(e) => setFormRequiresPrescription(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="requiresRxAdd" className="text-slate-700 font-semibold cursor-pointer">
                  Nécessite une ordonnance médicale obligatoire
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contre-indications (une par ligne)
                </label>
                <textarea
                  value={formContraindications}
                  onChange={(e) => setFormContraindications(e.target.value)}
                  rows={2}
                  placeholder="Ex: Insuffisance hépatique sévère..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Effets indésirables potentiels (un par ligne)
                </label>
                <textarea
                  value={formSideEffects}
                  onChange={(e) => setFormSideEffects(e.target.value)}
                  rows={2}
                  placeholder="Ex: Nausées, somnolence, réactions cutanées..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-prendre-rdv"
                >
                  {saving ? "Enregistrement..." : "Ajouter au catalogue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modifier un médicament */}
      {editMed && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="flex flex-col w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-teal-800 text-white">
              <h3 className="font-bold text-base">Modifier le médicament</h3>
              <button
                type="button"
                onClick={() => setEditMed(null)}
                className="p-1.5 text-teal-200 hover:text-white rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nom commercial du médicament *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dénomination Commune (DCI)
                  </label>
                  <input
                    type="text"
                    value={formGeneric}
                    onChange={(e) => setFormGeneric(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dosage
                  </label>
                  <input
                    type="text"
                    value={formDosage}
                    onChange={(e) => setFormDosage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Forme galénique
                  </label>
                  <select
                    value={formForm}
                    onChange={(e) => setFormForm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {FORM_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Catégorie thérapeutique
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fabricant / Laboratoire pharmaceutique
                </label>
                <input
                  type="text"
                  value={formManufacturer}
                  onChange={(e) => setFormManufacturer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="requiresRxEdit"
                  checked={formRequiresPrescription}
                  onChange={(e) => setFormRequiresPrescription(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="requiresRxEdit" className="text-slate-700 font-semibold cursor-pointer">
                  Nécessite une ordonnance médicale obligatoire
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contre-indications (une par ligne)
                </label>
                <textarea
                  value={formContraindications}
                  onChange={(e) => setFormContraindications(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Effets indésirables potentiels (un par ligne)
                </label>
                <textarea
                  value={formSideEffects}
                  onChange={(e) => setFormSideEffects(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditMed(null)}
                  disabled={saving}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-prendre-rdv"
                >
                  {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation de suppression */}
      {deleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-150">
            <span className="text-3xl block mb-2">🗑️</span>
            <h3 className="text-base font-bold text-slate-900">
              Supprimer ce médicament ?
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Êtes-vous sûr de vouloir retirer <strong>{deleteConfirm.name}</strong> du catalogue général ?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                {saving ? "Suppression..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
