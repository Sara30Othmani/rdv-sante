"use client";

import { useEffect, useRef } from "react";
import type { Appointment } from "@/lib/appointments";

/**
 * Fenêtre « Ordonnance » d'une consultation terminée.
 *
 * ➜ À brancher avec le module Ordonnances : charger l'ordonnance de
 *   `appointment.id` (modèle Prescription, route /api/prescriptions?appointmentId=…)
 *   et l'afficher à la place du message ci-dessous.
 */
export default function PrescriptionDialog({
  appointment: a,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="myrdv-dialog"
      aria-labelledby="rx-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // clic sur le fond
      }}
    >
      <div className="myrdv-dialog-body">
        <h2 id="rx-title">Ordonnance</h2>
        <p className="myrdv-dialog-summary">
          {a.doctorName} ·{" "}
          {new Date(`${a.date}T12:00:00`).toLocaleDateString("fr-FR", { dateStyle: "long" })} à{" "}
          {a.time}
        </p>

        {/* EMPLACEMENT du module Ordonnances */}
        <p className="myrdv-dialog-placeholder">
          L&apos;ordonnance de cette consultation s&apos;affichera ici.
        </p>

        <div className="myrdv-dialog-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </dialog>
  );
}
