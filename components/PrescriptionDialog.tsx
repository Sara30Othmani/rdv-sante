"use client";

import { useEffect, useRef, useState } from "react";
import type { Appointment } from "@/lib/appointments";
import { apiJson } from "@/lib/api";
import PrescriptionPrintModal, { type PrescriptionData } from "./prescriptions/PrescriptionPrintModal";

/**
 * Fenêtre « Ordonnance » d'une consultation terminée pour le patient.
 * Charge l'ordonnance réelle associée à la consultation depuis `/api/prescriptions`.
 */
export default function PrescriptionDialog({
  appointment: a,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [prescription, setPrescription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [printData, setPrintData] = useState<PrescriptionData | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    setLoading(true);
    apiJson<any[]>(`/api/prescriptions?appointmentId=${encodeURIComponent(a.id)}`)
      .then((list) => {
        if (list && list.length > 0) {
          setPrescription(list[0]);
        } else {
          setPrescription(null);
        }
      })
      .catch(() => {
        setPrescription(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [a.id]);

  const handlePrint = () => {
    if (!prescription) return;
    setPrintData({
      id: prescription.id,
      patientName: prescription.patient?.name || a.patientName,
      patientEmail: prescription.patient?.email,
      patientPhone: prescription.patient?.phone,
      doctorName: prescription.doctor?.name || a.doctorName,
      specialty: a.specialty || "Cabinet Médical",
      consultationDate: a.date,
      issuedAt: prescription.issuedAt,
      validUntil: prescription.validUntil,
      status: prescription.status,
      items: prescription.items,
    });
  };

  return (
    <>
      <dialog
        ref={ref}
        className="myrdv-dialog"
        aria-labelledby="rx-title"
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="myrdv-dialog-body max-w-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 id="rx-title" className="text-base font-bold text-slate-900">
                Ordonnance Médicale
              </h2>
              <p className="text-xs text-slate-500">
                {a.doctorName} · {a.specialty}
              </p>
            </div>
            <span className="text-2xl">📄</span>
          </div>

          <p className="myrdv-dialog-summary mt-3 text-xs text-slate-600">
            Consultation du {new Date(`${a.date}T12:00:00`).toLocaleDateString("fr-FR", { dateStyle: "long" })} à {a.time}
          </p>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
              Chargement de la prescription…
            </div>
          ) : prescription ? (
            <div className="mt-4 space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs">
                <span className="font-bold text-teal-900 block mb-2 uppercase tracking-wide text-[11px]">
                  Traitement prescrit :
                </span>
                <ul className="space-y-3">
                  {prescription.items.map((item: any, idx: number) => (
                    <li key={idx} className="bg-white p-3 rounded-xl border border-teal-100 shadow-2xs">
                      <div className="flex justify-between font-bold text-slate-900 text-xs">
                        <span>{item.medicationName} {item.dosage ? `(${item.dosage})` : ""}</span>
                        {item.durationDays && (
                          <span className="text-teal-700 font-semibold">{item.durationDays} jours</span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        Posologie : <strong>{item.frequency}</strong>
                      </p>
                      {item.instructions && (
                        <p className="text-slate-500 italic text-[11px] mt-0.5">
                          {item.instructions}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {prescription.validUntil && (
                <p className="text-[11px] text-slate-500">
                  Valable jusqu&apos;au :{" "}
                  <strong>{new Date(prescription.validUntil).toLocaleDateString("fr-FR")}</strong>
                </p>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300 mt-3">
              <p className="font-medium text-slate-700">Aucune ordonnance n&apos;a été délivrée pour cette consultation.</p>
              <p className="mt-1 text-slate-400">Si un traitement vous a été prescrit, contactez votre médecin.</p>
            </div>
          )}

          <div className="myrdv-dialog-actions mt-5 flex justify-end gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={onClose}>
              Fermer
            </button>
            {prescription && (
              <button
                type="button"
                onClick={handlePrint}
                className="btn-prendre-rdv text-xs flex items-center gap-1.5"
              >
                <span>🖨️</span>
                <span>Imprimer l&apos;ordonnance</span>
              </button>
            )}
          </div>
        </div>
      </dialog>

      <PrescriptionPrintModal
        isOpen={Boolean(printData)}
        onClose={() => setPrintData(null)}
        data={printData}
      />
    </>
  );
}
