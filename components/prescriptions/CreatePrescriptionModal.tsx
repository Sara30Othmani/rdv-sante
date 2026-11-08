"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";

type MedicationOption = {
  id: string;
  name: string;
  genericName?: string;
  dosage?: string;
  form?: string;
  category?: string;
};

type PrescriptionItemInput = {
  medicationId: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
};

export default function CreatePrescriptionModal({
  isOpen,
  onClose,
  appointment,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    patientId: string;
    patientName: string;
    date: string;
    specialty?: string;
    reason?: string;
  } | null;
  onCreated: (prescription: any) => void;
}) {
  const [medications, setMedications] = useState<MedicationOption[]>([]);
  const [loadingMeds, setLoadingMeds] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<PrescriptionItemInput[]>([
    {
      medicationId: "",
      dosage: "",
      frequency: "3 fois par jour",
      durationDays: 7,
      instructions: "Pendant les repas",
    },
  ]);

  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (isOpen) {
      setLoadingMeds(true);
      apiJson<MedicationOption[]>("/api/medications")
        .then((data) => setMedications(data))
        .catch(() => {})
        .finally(() => setLoadingMeds(false));
    }
  }, [isOpen]);

  if (!isOpen || !appointment) return null;

  const handleMedChange = (index: number, medId: string) => {
    const med = medications.find((m) => m.id === medId);
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        medicationId: medId,
        dosage: med?.dosage || copy[index].dosage,
      };
      return copy;
    });
  };

  const handleItemFieldChange = (
    index: number,
    field: keyof PrescriptionItemInput,
    value: any
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        medicationId: "",
        dosage: "",
        frequency: "2 fois par jour",
        durationDays: 5,
        instructions: "",
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Valider qu'au moins un médicament est sélectionné
    const emptyMed = items.some((i) => !i.medicationId);
    if (emptyMed) {
      setError("Veuillez sélectionner un médicament pour chaque ligne de prescription.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        appointmentId: appointment.id,
        items,
        validUntil,
      };

      const result = await apiJson("/api/prescriptions", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onCreated(result);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de l'ordonnance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="flex flex-col w-full max-w-3xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-700 to-teal-800 text-white">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <h2 className="text-base font-bold">Rédiger une ordonnance médicale</h2>
              <p className="text-xs text-teal-100">
                Patient : <strong>{appointment.patientName}</strong> · Consultation du {appointment.date}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-teal-100 hover:text-white rounded-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Informations consultation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Patient :</span>{" "}
              <strong className="text-slate-900">{appointment.patientName}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Date de consultation :</span>{" "}
              <strong className="text-slate-900">{appointment.date}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Motif :</span>{" "}
              <span className="text-slate-700">{appointment.reason || "Consultation de suivi"}</span>
            </div>
            <div>
              <label htmlFor="validUntilInput" className="text-slate-500 font-medium mr-2">
                Validité jusqu&apos;au :
              </label>
              <input
                id="validUntilInput"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-md font-semibold text-slate-800 text-xs"
              />
            </div>
          </div>

          {/* Liste des médicaments à prescrire */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>💊</span> Médicaments &amp; Posologies
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 hover:bg-teal-100 transition-colors"
              >
                + Ajouter un médicament
              </button>
            </div>

            <div className="space-y-4">
              {items.map((row, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                      Médicament #{index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="text-xs text-red-600 hover:text-red-800 font-semibold"
                      >
                        Supprimer cette ligne
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Choix du médicament */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Médicament (du catalogue) *
                      </label>
                      <select
                        value={row.medicationId}
                        onChange={(e) => handleMedChange(index, e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        required
                      >
                        <option value="">-- Sélectionner un médicament --</option>
                        {medications.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.dosage ? `(${m.dosage})` : ""} - {m.category || "Général"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dosage */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Dosage prescrit
                      </label>
                      <input
                        type="text"
                        value={row.dosage}
                        onChange={(e) => handleItemFieldChange(index, "dosage", e.target.value)}
                        placeholder="Ex: 500 mg, 1g, 2 pulvérisations..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>

                    {/* Fréquence */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Fréquence / Rythme de prise *
                      </label>
                      <input
                        type="text"
                        value={row.frequency}
                        onChange={(e) => handleItemFieldChange(index, "frequency", e.target.value)}
                        placeholder="Ex: 3 fois par jour, matin et soir..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        required
                      />
                    </div>

                    {/* Durée en jours */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Durée du traitement (jours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={row.durationDays}
                        onChange={(e) =>
                          handleItemFieldChange(index, "durationDays", Number(e.target.value) || 1)
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Instructions &amp; Recommandations de prise
                    </label>
                    <input
                      type="text"
                      value={row.instructions}
                      onChange={(e) => handleItemFieldChange(index, "instructions", e.target.value)}
                      placeholder="Ex: À prendre au milieu des repas avec un grand verre d'eau..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <span>📄</span>
              <span>{submitting ? "Génération en cours..." : "Valider & Délivrer l'ordonnance"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
