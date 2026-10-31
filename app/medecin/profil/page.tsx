"use client";

import DoctorProfileForm from "@/components/DoctorProfileForm/page";
import ScheduleManager from "@/components/ScheduleManager";
import "../../globals.css";
import { toast, Toaster } from "sonner";

export default function DoctorProfilePage() {
  return (
    <main className="doctor-profile-page">
      <div className="doctor-profile-header">
        <span className="doctor-profile-eyebrow">Espace médecin</span>
        <br></br>
        <h1>Mon profil professionnel</h1>

        <p>
          Gérez vos informations professionnelles et vos horaires de
          consultation.
        </p>
      </div>

      <section className="doctor-profile-section">
        <DoctorProfileForm
          onSuccess={() => {
            toast.success("Modification bien effectuée !");
          }}
        />
      </section>

      <section className="doctor-profile-section doctor-schedule-section">
        <ScheduleManager />
      </section>
    </main>
  );
}
