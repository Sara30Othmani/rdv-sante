"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/api";
import PrescriptionPrintModal, { type PrescriptionData } from "@/components/prescriptions/PrescriptionPrintModal";
import CreatePrescriptionModal from "@/components/prescriptions/CreatePrescriptionModal";

export default function MedecinOrdonnancesPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [printData, setPrintData] = useState<PrescriptionData | null>(null);
  const [selectedApptForNew, setSelectedApptForNew] = useState<any | null>(null);
  const [isChooseApptOpen, setIsChooseApptOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prescList, apptList] = await Promise.all([
        apiJson<any[]>("/api/prescriptions"),
        apiJson<any[]>("/api/appointments"),
      ]);
      setPrescriptions(prescList);
      // Rendez-vous terminés du médecin
      const completed = apptList.filter(
        (a) => a.status === "Terminé" || a.status === "DONE" || a.status === "Accepté"
      );
      setCompletedAppointments(completed);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des ordonnances.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return prescriptions.filter((p) => {
      const pName = p.patient?.name || "";
      const matchesSearch =
        !search.trim() ||
        pName.toLowerCase().includes(search.toLowerCase()) ||
        p.items.some((i: any) =>
          i.medicationName.toLowerCase().includes(search.toLowerCase())
        );

      const matchesStatus =
        statusFilter === "ALL" || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [prescriptions, search, statusFilter]);

  const handleOpenPrint = (p: any) => {
    setPrintData({
      id: p.id,
      patientName: p.patient?.name || "Patient",
      patientEmail: p.patient?.email,
      patientPhone: p.patient?.phone,
      doctorName: p.doctor?.name || "Médecin Traitant",
      specialty: p.appointment?.specialty || "Cabinet Médical",
      consultationDate: p.appointment?.date,
      issuedAt: p.issuedAt,
      validUntil: p.validUntil,
      status: p.status,
      items: p.items,
    });
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Voulez-vous vraiment annuler cette ordonnance ?")) return;
    try {
      await apiJson(`/api/prescriptions/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Impossible d'annuler l'ordonnance.");
    }
  };

  return (
    <main className="appointments-page">
      {/* Header */}
      <header className="appointments-header">
        <div>
          <span className="appointments-eyebrow">ESPACE PROFESSIONNEL MÉDECIN</span>
          <h1>Gestion des ordonnances médicales</h1>
          <p>
            Création, délivrance et suivi des prescriptions médicamenteuses rédigées après consultation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/medecin/medicaments"
            className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <span>💊</span>
            <span>Catalogue médicaments</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsChooseApptOpen(true)}
            className="btn-prendre-rdv flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Nouvelle ordonnance</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl my-4">
          {error}
        </div>
      )}

      {/* Barre de recherche et de filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par patient ou médicament prescrit..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Statut :</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium text-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
          >
            <option value="ALL">Toutes ({prescriptions.length})</option>
            <option value="ACTIVE">Actives</option>
            <option value="CANCELLED">Annulées</option>
          </select>
        </div>
      </div>

      {/* Liste des ordonnances */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
          <span className="text-3xl block animate-bounce mb-2">📄</span>
          Chargement de vos ordonnances…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          <span className="text-3xl block mb-2">📋</span>
          <p className="font-semibold text-slate-700 mb-1">Aucune ordonnance trouvée</p>
          <p className="text-xs text-slate-500 mb-4">
            Rédigez une ordonnance pour un patient après sa consultation médicale.
          </p>
          <button
            type="button"
            onClick={() => setIsChooseApptOpen(true)}
            className="btn-prendre-rdv text-xs"
          >
            + Rédiger une ordonnance
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Consultation</th>
                  <th className="py-3 px-4">Médicaments prescrits</th>
                  <th className="py-3 px-4">Date délivrance</th>
                  <th className="py-3 px-4">Validité</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((p) => {
                  const isCancelled = p.status === "CANCELLED";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block font-semibold">
                          {p.patient?.name || "Patient"}
                        </strong>
                        <span className="text-[11px] text-slate-500">
                          {p.patient?.phone || p.patient?.email || "–"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-medium">{p.appointment?.date || "–"}</span>
                        {p.appointment?.specialty && (
                          <span className="block text-[11px] text-slate-500">
                            {p.appointment.specialty}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.items.map((it: any, i: number) => (
                            <span
                              key={i}
                              className="inline-block bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-md"
                            >
                              {it.medicationName} ({it.dosage || it.frequency})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(p.issuedAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {p.validUntil
                          ? new Date(p.validUntil).toLocaleDateString("fr-FR")
                          : "Non limitée"}
                      </td>
                      <td className="py-3.5 px-4">
                        {isCancelled ? (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-50 rounded-full">
                            Annulée
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-full">
                            ✓ Active
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(p)}
                            className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                          >
                            <span>👁️</span>
                            <span>Afficher / Imprimer</span>
                          </button>
                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={() => handleCancel(p.id)}
                              title="Annuler cette ordonnance"
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Sélectionner une consultation pour créer une ordonnance */}
      {isChooseApptOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="flex flex-col w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-teal-800 text-white">
              <h3 className="font-bold text-base">Choisir le patient / consultation</h3>
              <button
                type="button"
                onClick={() => setIsChooseApptOpen(false)}
                className="p-1.5 text-teal-200 hover:text-white rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 text-xs">
              <p className="text-slate-600 mb-2">
                Sélectionnez le rendez-vous pour lequel vous souhaitez délivrer une prescription :
              </p>

              {completedAppointments.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                  Aucun rendez-vous disponible pour prescription. Vous pouvez également rédiger une ordonnance depuis la page « Gérer les rendez-vous ».
                </div>
              ) : (
                <div className="space-y-2">
                  {completedAppointments.map((appt) => (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => {
                        setSelectedApptForNew(appt);
                        setIsChooseApptOpen(false);
                      }}
                      className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 transition-all flex items-center justify-between group"
                    >
                      <div>
                        <strong className="text-slate-900 block font-semibold text-sm">
                          {appt.patientName}
                        </strong>
                        <span className="text-slate-500">
                          Date : {appt.date} à {appt.time} · {appt.reason}
                        </span>
                      </div>
                      <span className="text-teal-700 font-bold group-hover:translate-x-1 transition-transform">
                        Rédiger →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Création Ordonnance */}
      <CreatePrescriptionModal
        isOpen={Boolean(selectedApptForNew)}
        onClose={() => setSelectedApptForNew(null)}
        appointment={selectedApptForNew}
        onCreated={() => {
          setSelectedApptForNew(null);
          loadData();
        }}
      />

      {/* Modal Affichage / Impression Officielle */}
      <PrescriptionPrintModal
        isOpen={Boolean(printData)}
        onClose={() => setPrintData(null)}
        data={printData}
      />
    </main>
  );
}
