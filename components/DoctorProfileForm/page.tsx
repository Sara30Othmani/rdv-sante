
"use client";

import { useEffect, useState } from "react";
import "../../app/doctor.css";


export default function DoctorProfileForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    specialty: "",
    address: "",
    city: "",
    price: "",
    licenseNumber: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Récupérer le profil automatiquement créé à l'inscription
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/doctor/profile");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Impossible de récupérer le profil.");
        }

        const profile = data.profile;

        setForm({
          specialty:
            profile.specialty === "À renseigner"
              ? ""
              : profile.specialty ?? "",
          address: profile.address ?? "",
          city:
            profile.city === "À renseigner"
              ? ""
              : profile.city ?? "",
          price: String(profile.price ?? 0),
          licenseNumber: profile.licenseNumber ?? "",
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Modifier le profil existant
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/doctor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Modification impossible.");
      }

      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Chargement de votre profil...</p>;
  }

  return (
    <section className="doctor-profile-container">
     <br></br>

      <form onSubmit={submit} className="doctor-profile-form">

        <div className="doctor-form-group">
          <label htmlFor="specialty">Spécialité médicale *</label>
          <select
            id="specialty"
            required
            value={form.specialty}
            onChange={(e) => update("specialty", e.target.value)}
          >
            <option value="">Choisir une spécialité</option>
            <option value="Médecine générale">Médecine générale</option>
            <option value="Cardiologie">Cardiologie</option>
            <option value="Dermatologie">Dermatologie</option>
            <option value="Pédiatrie">Pédiatrie</option>
            <option value="Gynécologie">Gynécologie</option>
            <option value="Ophtalmologie">Ophtalmologie</option>
            <option value="Dentisterie">Dentisterie</option>
            <option value="Neurologie">Neurologie</option>
            <option value="Psychiatrie">Psychiatrie</option>
            <option value="ORL">ORL</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        <div className="doctor-form-group">
          <label htmlFor="licenseNumber">
            Numéro d'ordre / licence *
          </label>
          <input
            id="licenseNumber"
            type="text"
            required
            value={form.licenseNumber}
            onChange={(e) => update("licenseNumber", e.target.value)}
            placeholder="Votre numéro professionnel"
          />
        </div>

        <div className="doctor-form-group">
          <label htmlFor="address">Adresse du cabinet *</label>
          <input
            id="address"
            type="text"
            required
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="Ex. : Avenue Habib Bourguiba"
          />
        </div>

        <div className="doctor-form-group">
          <label htmlFor="city">Ville *</label>
          <input
            id="city"
            type="text"
            required
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Ex. : Tunis"
          />
        </div>

        <div className="doctor-form-group">
          <label htmlFor="price">Prix de consultation (TND) *</label>
          <input
            id="price"
            type="number"
            min="0"
            step="1"
            required
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            placeholder="Ex. : 60"
          />
        </div>

        {error && (
          <p className="doctor-form-error">{error}</p>
        )}

        <button
          type="submit"
          className="btn-prendre-rdv"
          disabled={saving}
        >
          {saving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </form>
      <br></br>
    </section>
  );
}
