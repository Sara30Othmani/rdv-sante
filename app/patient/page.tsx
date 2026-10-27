"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDoctors } from "@/lib/useAppointments";

export default function PatientHomePage() {
  const { doctors, loaded, error } = useDoctors();
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");

  const specialties = useMemo(
    () => [...new Set(doctors.map((d) => d.specialty))].sort(),
    [doctors]
  );
  const cities = useMemo(
    () => [...new Set(doctors.map((d) => d.city))].sort(),
    [doctors]
  );

  const filteredDoctors = doctors.filter(
    (d) => (!specialty || d.specialty === specialty) && (!city || d.city === city)
  );

  function resetFilters() {
    setSpecialty("");
    setCity("");
  }

  return (
    <main className="doctors-page">
      <header className="doctors-page-header">
        <div>
          <span className="doctors-eyebrow">RDV Santé</span>
          <h1>Trouvez votre médecin</h1>
          <p>
            Découvrez nos professionnels de santé et prenez rendez-vous en
            quelques clics.
          </p>
        </div>

        <div className="doctors-count">
          <strong>{filteredDoctors.length}</strong>
          <span>
            {filteredDoctors.length > 1
              ? "médecins disponibles"
              : "médecin disponible"}
          </span>
        </div>
      </header>

      {/* Filtres de recherche */}
      <section className="doctor-filters" aria-label="Filtres des médecins">
        <div className="doctor-filter-field">
          <label htmlFor="filter-specialty">Spécialité médicale</label>
          <select
            id="filter-specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          >
            <option value="">Toutes les spécialités</option>
            {specialties.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="doctor-filter-field">
          <label htmlFor="filter-city">Ville</label>
          <select
            id="filter-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">Toutes les villes</option>
            {cities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="doctor-filter-reset"
          onClick={resetFilters}
          disabled={!specialty && !city}
        >
          Réinitialiser
        </button>
      </section>

      <div className="doctor-results-heading">
        <h2>Nos médecins</h2>
        <span>
          {filteredDoctors.length} résultat
          {filteredDoctors.length > 1 ? "s" : ""}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="doctors-list">
        {!loaded ? (
          <p>Chargement des médecins…</p>
        ) : filteredDoctors.length > 0 ? (
          filteredDoctors.map((doctor) => (
            <article className="doctor-card" key={doctor.id}>
              <div className="doctor-avatar">{doctor.initials}</div>

              <div className="doctor-info">
                <span className="doctor-specialty">{doctor.specialty}</span>
                <h2>{doctor.name}</h2>
                <p className="doctor-address">
                  <span aria-hidden="true">⌖</span>
                  {doctor.address}, {doctor.city}
                </p>
                <div className="doctor-reservations">
                  <span className="reservation-dot" />
                  <span>Réservations en cours</span>
                  <strong>{doctor.reservations}</strong>
                </div>
              </div>

              <div className="doctor-actions">
                <Link
                  href={`/patient/rendez-vous/nouveau?doctorId=${doctor.id}`}
                  className="doctor-book-button"
                >
                  Prendre rendez-vous
                </Link>
              </div>
            </article>
          ))
        ) : (
          <div className="doctor-empty-state">
            <span className="doctor-empty-icon" aria-hidden="true">
              ⌕
            </span>
            <h3>Aucun médecin trouvé</h3>
            <p>
              Aucun médecin ne correspond à cette spécialité et à cette ville.
              Essayez de modifier vos filtres.
            </p>
            <button
              type="button"
              className="doctor-filter-reset"
              onClick={resetFilters}
            >
              Afficher tous les médecins
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
