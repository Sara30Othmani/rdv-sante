"use client";

import { Suspense, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createAppointment, useDoctors } from "@/lib/useAppointments";

function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getBusinessDays(count: number) {
  const dates: Date[] = [];
  const current = new Date();
  current.setHours(12, 0, 0, 0);

  while (dates.length < count) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatDate(date: Date) {
  const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short" })
    .format(date)
    .replace(".", "");
  const month = new Intl.DateTimeFormat("fr-FR", { month: "short" })
    .format(date)
    .replace(".", "");

  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    label: `${date.getDate()} ${month}`,
  };
}

function NouveauRDVContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { doctors, loaded } = useDoctors();

  // Médecin choisi sur la page précédente
  const doctorId = searchParams.get("doctorId");
  const doctor = doctors.find((d) => d.id === doctorId);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const dates = useMemo(() => getBusinessDays(15), []);
  const slots = doctor?.availableSlots ?? [];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!doctor || !date || !time || reason.trim().length < 5) return;

    setError("");
    setSaving(true);
    try {
      // Le patient et le tarif sont déterminés par le serveur
      await createAppointment({
        doctorId: doctor.id,
        date,
        time,
        reason: reason.trim(),
      });
      router.push("/patient/rendez-vous");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <main className="booking-page">
        <p>Chargement des informations du médecin...</p>
      </main>
    );
  }

  if (!doctor) {
    return (
      <main className="booking-page">
        <div className="booking-card">
          <h1>Médecin introuvable</h1>
          <p>
            Veuillez sélectionner un médecin avant de prendre un rendez-vous.
          </p>
          <button
            type="button"
            className="booking-confirm"
            onClick={() => router.push("/patient")}
          >
            Retour aux médecins
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="booking-page">
      <header className="booking-heading">
        <h1>Prendre un rendez-vous</h1>
        <p>Choisissez une date et un créneau pour votre consultation.</p>
      </header>

      {/* Informations du médecin sélectionné */}
      <section className="booking-doctor">
        <div className="booking-doctor-top">
          <div className="booking-avatar">{doctor.initials}</div>

          <div className="booking-doctor-info">
            <span className="booking-eyebrow">MÉDECIN SÉLECTIONNÉ</span>
            <h2>{doctor.name}</h2>
            <p>{doctor.specialty}</p>
            <p className="booking-address">📍 {doctor.address}</p>
          </div>

          <div className="booking-price">
            <span>Tarif indicatif</span>
            <strong>{doctor.price} TND</strong>
          </div>
        </div>
      </section>

      <form className="booking-card" onSubmit={handleSubmit}>
        <section className="booking-section">
          <h2>Créneaux disponibles</h2>

          <div className="booking-date-section">
            <h3>Sélectionner une date</h3>

            <div className="booking-date-list">
              {dates.map((day) => {
                const value = toLocalISODate(day);
                const formatted = formatDate(day);
                const selected = date === value;

                return (
                  <button
                    type="button"
                    key={value}
                    className={`booking-date ${selected ? "is-selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => {
                      setDate(value);
                      setTime("");
                    }}
                  >
                    <span>
                      {formatted.weekday} {formatted.label}
                    </span>
                    <small>{slots.length} créneaux</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="booking-time-section">
            <h3>Sélectionner une heure</h3>

            <div className="booking-time-list">
              {slots.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  className={`booking-time ${time === slot ? "is-selected" : ""}`}
                  aria-pressed={time === slot}
                  disabled={!date}
                  onClick={() => setTime(slot)}
                >
                  {slot}
                </button>
              ))}
            </div>

            {!date && (
              <p className="booking-hint">Sélectionnez d&apos;abord une date.</p>
            )}
          </div>
        </section>

        <section className="booking-section booking-reason">
          <label htmlFor="reason">Motif de consultation</label>
          <textarea
            id="reason"
            rows={4}
            minLength={5}
            maxLength={500}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Décrivez brièvement le motif..."
          />
          <small>{reason.length}/500 caractères</small>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <footer className="booking-footer">
          <button
            type="button"
            className="booking-cancel"
            onClick={() => router.push("/patient")}
          >
            Annuler
          </button>

          <button
            type="submit"
            className="booking-confirm"
            disabled={saving || !date || !time || reason.trim().length < 5}
          >
            Confirmer le rendez-vous
          </button>
        </footer>
      </form>
    </main>
  );
}

export default function NouveauRDV() {
  return (
    <Suspense
      fallback={
        <main className="booking-page">
          <p>Chargement des informations du médecin...</p>
        </main>
      }
    >
      <NouveauRDVContent />
    </Suspense>
  );
}
