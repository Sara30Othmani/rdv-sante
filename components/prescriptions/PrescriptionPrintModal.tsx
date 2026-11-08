"use client";

import { useRef } from "react";

export type PrescriptionItem = {
  medicationId?: string;
  medicationName: string;
  medicationGeneric?: string;
  form?: string;
  dosage: string;
  frequency: string;
  durationDays?: number | null;
  instructions?: string;
};

export type PrescriptionData = {
  id: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  doctorName: string;
  specialty?: string;
  consultationDate?: string;
  issuedAt: string;
  validUntil?: string | null;
  status?: string;
  items: PrescriptionItem[];
};

export default function PrescriptionPrintModal({
  isOpen,
  onClose,
  data,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: PrescriptionData | null;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "–";
    return new Date(isoStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="flex flex-col w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">📄</span>
            <span className="font-semibold text-sm">Ordonnance Médicale Officielle</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              #{data.id.slice(-6).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <span>🖨️</span>
              <span>Imprimer / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Prescription Body */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-8 sm:p-10 bg-white text-slate-800">
          {/* Entête Cabinet Médical */}
          <div className="border-b-2 border-teal-700 pb-5 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-teal-900 tracking-tight">
                {data.doctorName.startsWith("Dr.") ? data.doctorName : `Dr. ${data.doctorName}`}
              </h1>
              <p className="text-sm font-semibold text-teal-700">
                Spécialité : {data.specialty || "Médecine Générale"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Cabinet Médical RDV Santé</p>
              <p className="text-xs text-slate-400">Conventionné — Ordre des Médecins</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-teal-50 border border-teal-200 rounded-xl text-xs font-semibold text-teal-800 mb-1">
                ORDONNANCE MÉDICALE
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Délivrée le : <strong>{formatDate(data.issuedAt)}</strong>
              </p>
              {data.validUntil && (
                <p className="text-[11px] text-slate-400">
                  Valable jusqu&apos;au : {formatDate(data.validUntil)}
                </p>
              )}
            </div>
          </div>

          {/* Section Patient */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8 flex flex-wrap justify-between items-center text-sm">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                Prescription établie pour :
              </span>
              <strong className="text-base text-slate-900">{data.patientName}</strong>
            </div>
            {data.consultationDate && (
              <div className="text-right text-xs text-slate-600">
                <span>Date de consultation : </span>
                <strong>{data.consultationDate}</strong>
              </div>
            )}
          </div>

          {/* Corps de la Prescription (Rx) */}
          <div className="mb-8 min-h-[220px]">
            <div className="flex items-center gap-2 mb-4 text-teal-800 font-bold text-lg font-serif">
              <span className="text-2xl">℞</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-sans">
                Prescription Médicamenteuse
              </span>
            </div>

            <ol className="space-y-5">
              {data.items.map((item, idx) => (
                <li key={idx} className="border-b border-slate-100 pb-4 last:border-0">
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold text-slate-900">
                      {idx + 1}. {item.medicationName}{" "}
                      <span className="font-normal text-slate-600 text-sm">
                        {item.dosage ? `(${item.dosage})` : ""}
                      </span>
                    </span>
                    {item.durationDays && (
                      <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                        Pendant {item.durationDays} jour{item.durationDays > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {item.medicationGeneric && item.medicationGeneric !== item.medicationName && (
                    <p className="text-xs text-slate-500 italic">DCI : {item.medicationGeneric}</p>
                  )}

                  <p className="text-sm font-medium text-slate-800 mt-1">
                    Posologie : <span className="text-teal-900 font-semibold">{item.frequency}</span>
                  </p>

                  {item.instructions && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      Instructions : <em>{item.instructions}</em>
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Pied de page et Signature */}
          <div className="border-t border-slate-200 pt-6 mt-8 flex justify-between items-end">
            <div className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
              * Document médical certifié conforme. À présenter au pharmacien avec votre carte d&apos;assuré.
              Ne pas modifier sans avis médical préalable.
            </div>

            <div className="text-center w-52">
              <p className="text-xs font-semibold text-slate-700 mb-2">Signature &amp; Cachet du Médecin</p>
              <div className="h-20 border border-dashed border-teal-300 rounded-2xl flex flex-col items-center justify-center bg-teal-50/40 p-2">
                <span className="text-xs font-serif italic text-teal-800">
                  {data.doctorName.startsWith("Dr.") ? data.doctorName : `Dr. ${data.doctorName}`}
                </span>
                <span className="text-[10px] text-teal-600 mt-1">✓ Signature électronique certifiée</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
