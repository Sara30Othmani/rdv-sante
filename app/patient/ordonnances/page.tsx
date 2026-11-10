"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/api";
import PrescriptionPrintModal, { type PrescriptionData } from "@/components/prescriptions/PrescriptionPrintModal";

export default function PatientOrdonnancesPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [printData, setPrintData] = useState<PrescriptionData | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<any[]>("/api/prescriptions");
      setPrescriptions(data);
    } catch (err: any) {
      setError(err.message || "Impossible de charger vos ordonnances.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenPrint = (p: any) => {
    setPrintData({
      id: p.id,
      patientName: p.patient?.name || "Patient",
      patientEmail: p.patient?.email,
      patientPhone: p.patient?.phone,
      doctorName: p.doctor?.name || "Dr. Traitant",
      specialty: p.appointment?.specialty || "Médecine",
      consultationDate: p.appointment?.date,
      issuedAt: p.issuedAt,
      validUntil: p.validUntil,
      status: p.status,
      items: p.items,
    });
  };

  return (
    <main className="appointments-page">
      {/* Header */}
      <header className="appointments-header">
        <div>
          <span className="appointments-eyebrow">ESPACE PATIENT</span>
          <h1>Mes ordonnances médicales</h1>
          <p>
            Retrouvez et imprimez l&apos;ensemble des prescriptions rédigées par vos médecins après consultation.
          </p>
        </div>
        <div>
          <Link
            href="/patient/rendez-vous"
            className="btn-prendre-rdv"
          >
            Prendre un rendez-vous
          </Link>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl my-4">
          {error}
        </div>
      )}

      {/* Liste des ordonnances */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
          <span className="text-3xl block animate-bounce mb-2">📄</span>
          Chargement de vos ordonnances médicales…
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          <span className="text-4xl block mb-3">📋</span>
          <h3 className="font-bold text-base text-slate-800 mb-1">Aucune ordonnance disponible</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            Vos ordonnances apparaîtront automatiquement ici dès qu&apos;un médecin en aura rédigé une à la suite de votre consultation.
          </p>
          <Link href="/patient/rendez-vous" className="btn-prendre-rdv text-xs">
            Consulter mes rendez-vous
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {prescriptions.map((p) => {
            const isCancelled = p.status === "CANCELLED";
            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center text-xl shrink-0">
                        ⚕️
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          {p.doctor?.name || "Dr. Traitant"}
                        </h2>
                        <p className="text-xs font-semibold text-teal-700">
                          {p.appointment?.specialty || "Cabinet Médical"}
                        </p>
                      </div>
                    </div>
                    {isCancelled ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700">
                        Annulée
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ✓ Valide
                      </span>
                    )}
                  </div>

                  {/* Détails date */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 mb-4 text-xs space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>Délivrée le :</span>
                      <strong className="text-slate-900">
                        {new Date(p.issuedAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </strong>
                    </div>
                    {p.validUntil && (
                      <div className="flex justify-between">
                        <span>Valable jusqu&apos;au :</span>
                        <strong className="text-slate-700">
                          {new Date(p.validUntil).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Médicaments */}
                  <div className="mb-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Traitement prescrit ({p.items.length} médicament{p.items.length > 1 ? "s" : ""}) :
                    </h3>
                    <ul className="space-y-2">
                      {p.items.map((it: any, idx: number) => (
                        <li
                          key={idx}
                          className="p-2.5 rounded-xl bg-teal-50/40 border border-teal-100 text-xs"
                        >
                          <div className="flex justify-between items-baseline font-bold text-slate-900">
                            <span>
                              {it.medicationName}{" "}
                              {it.dosage && (
                                <span className="font-normal text-slate-600">({it.dosage})</span>
                              )}
                            </span>
                            {it.durationDays && (
                              <span className="text-[11px] font-semibold text-teal-700">
                                {it.durationDays} jours
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Posologie : <strong className="text-teal-900">{it.frequency}</strong>
                          </p>
                          {it.instructions && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">
                              {it.instructions}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPrint(p)}
                  className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <span>🖨️</span>
                  <span>Voir &amp; Imprimer l&apos;ordonnance officielle</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Impression */}
      <PrescriptionPrintModal
        isOpen={Boolean(printData)}
        onClose={() => setPrintData(null)}
        data={printData}
      />
    </main>
  );
}
