/**
 * Jeu de données de démarrage : npm run seed
 * ⚠ VIDE les collections concernées avant d'insérer (développement uniquement).
 */
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import UserModel from "@/models/User";
import DoctorProfile from "@/models/DoctorProfile";
import Appointment from "@/models/Appointment";
import FeedbackModel from "@/models/Feedback";
import Medication from "@/models/Medication";
import StockItem from "@/models/StockItem";
import { hashPassword } from "@/lib/password";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed interdit en production.");
  }
  await connectDB();

  await Promise.all([
    UserModel.deleteMany({}),
    DoctorProfile.deleteMany({}),
    Appointment.deleteMany({}),
    FeedbackModel.deleteMany({}),
    Medication.deleteMany({}),
    StockItem.deleteMany({}),
  ]);

  const demoPassword = await hashPassword("Demo1234");

  // ---- Utilisateurs (mots de passe créés via le module d'authentification)
  const [sarra, ahmed, amel, yassine, mariem] = await UserModel.insertMany([
    { name: "Sarra Ben Ali", email: "sarra@demo.tn", passwordHash: demoPassword, role: "PATIENT", emailVerified: true },
    { name: "Ahmed Mansour", email: "ahmed@demo.tn", passwordHash: demoPassword, role: "PATIENT", emailVerified: true },
    { name: "Dr. Amel Ben Salem", email: "amel@demo.tn", passwordHash: demoPassword, role: "DOCTOR", emailVerified: true },
    { name: "Dr. Yassine Trabelsi", email: "yassine@demo.tn", passwordHash: demoPassword, role: "DOCTOR", emailVerified: true },
    { name: "Dr. Mariem Gharbi", email: "mariem@demo.tn", passwordHash: demoPassword, role: "DOCTOR", emailVerified: true },
  ]);

  await DoctorProfile.insertMany([
    {
      userId: amel._id, specialty: "Cardiologie", address: "Tunis", city: "Tunis",
      price: 80, availableSlots: ["09:00", "10:00", "11:00", "14:00"],
      verified: true, isModerator: true,
    },
    {
      userId: yassine._id, specialty: "Dermatologie", address: "Ariana", city: "Ariana",
      price: 60, availableSlots: ["09:30", "11:30", "15:00"], verified: true,
    },
    {
      userId: mariem._id, specialty: "Médecine générale", address: "La Marsa", city: "La Marsa",
      price: 50, availableSlots: ["08:30", "10:30", "13:30"], verified: true,
    },
  ]);

  // ---- Rendez-vous (deux à venir, trois terminés pour pouvoir laisser un avis)
  const [, , done1, done2] = await Appointment.insertMany([
    {
      patientId: sarra._id, patientName: sarra.name, doctorId: amel._id, doctorName: amel.name,
      specialty: "Cardiologie", date: "2026-11-05", time: "10:00",
      reason: "Consultation de suivi", status: "PENDING", price: 80,
    },
    {
      patientId: ahmed._id, patientName: ahmed.name, doctorId: yassine._id, doctorName: yassine.name,
      specialty: "Dermatologie", date: "2026-11-10", time: "11:30",
      reason: "Consultation dermatologique", status: "ACCEPTED", price: 60,
    },
    {
      patientId: sarra._id, patientName: sarra.name, doctorId: yassine._id, doctorName: yassine.name,
      specialty: "Dermatologie", date: "2026-09-12", time: "09:30",
      reason: "Contrôle de la peau", status: "DONE", notes: "Aucune anomalie détectée.", price: 60,
    },
    {
      patientId: ahmed._id, patientName: ahmed.name, doctorId: amel._id, doctorName: amel.name,
      specialty: "Cardiologie", date: "2026-09-20", time: "14:00",
      reason: "Bilan cardiaque", status: "DONE", price: 80,
    },
    {
      patientId: sarra._id, patientName: sarra.name, doctorId: amel._id, doctorName: amel.name,
      specialty: "Cardiologie", date: "2026-08-03", time: "11:00",
      reason: "Première consultation", status: "DONE", price: 80,
    },
  ]);

  // ---- Feedbacks
  await FeedbackModel.insertMany([
    {
      clientId: "demo-review-1", userId: ahmed._id, userName: ahmed.name,
      doctorId: amel._id, doctorName: amel.name, appointmentId: done2._id,
      type: "REVIEW", rating: 5, content: "Très bon médecin, à l'écoute et ponctuelle.",
    },
    {
      clientId: "demo-complaint-1", userId: sarra._id, userName: sarra.name,
      doctorId: yassine._id, doctorName: yassine.name, appointmentId: done1._id,
      type: "COMPLAINT", subject: "Attente trop longue",
      content: "J'ai attendu plus d'une heure malgré mon rendez-vous.",
    },
  ]);

  // ---- Médicaments + un peu de stock pour le Dr Amel (modules à venir)
  const [para, amox] = await Medication.insertMany([
    { name: "Paracétamol", genericName: "Paracétamol", form: "TABLET", dosage: "500 mg", category: "Antalgique", createdBy: amel._id },
    { name: "Amoxicilline", genericName: "Amoxicilline", form: "CAPSULE", dosage: "1 g", category: "Antibiotique", requiresPrescription: true, createdBy: amel._id },
    { name: "Ibuprofène", genericName: "Ibuprofène", form: "TABLET", dosage: "400 mg", category: "Anti-inflammatoire", createdBy: amel._id },
  ]);

  await StockItem.insertMany([
    {
      doctorId: amel._id, medicationId: para._id, quantity: 40, lowStockThreshold: 10,
      batches: [{ batchNumber: "P-2026-01", quantity: 40, expiresAt: new Date("2027-06-30") }],
    },
    {
      doctorId: amel._id, medicationId: amox._id, quantity: 3, lowStockThreshold: 5,
      batches: [{ batchNumber: "A-2026-02", quantity: 3, expiresAt: new Date("2026-12-31") }],
    },
  ]);

  console.log("✔ Données de démonstration créées.");
  console.log("   Identifiants : sarra@demo.tn / ahmed@demo.tn / amel@demo.tn / yassine@demo.tn / mariem@demo.tn");
  console.log("   Mot de passe : Demo1234");
}

main()
  .catch((e) => {
    console.error("✘ Seed échoué :", e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());