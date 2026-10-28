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
import StockMovement from "@/models/StockMovement";

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
    StockMovement.deleteMany({}),
  ]);

  // ---- Utilisateurs (mots de passe : à créer avec le module d'authentification)
  const [sarra, ahmed, amel, yassine, mariem] = await UserModel.insertMany([
    { name: "Sarra Ben Ali", email: "sarra@demo.tn", role: "PATIENT" },
    { name: "Ahmed Mansour", email: "ahmed@demo.tn", role: "PATIENT" },
    { name: "Dr. Amel Ben Salem", email: "amel@demo.tn", role: "DOCTOR" },
    { name: "Dr. Yassine Trabelsi", email: "yassine@demo.tn", role: "DOCTOR" },
    { name: "Dr. Mariem Gharbi", email: "mariem@demo.tn", role: "DOCTOR" },
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

  // ---- Module 3 : Médicaments, matériel médical et stock médecin (Amira)
  const [para, amox, ibup, seringues, coton, drap, alcool, compresses] = await Medication.insertMany([
    {
      name: "Paracétamol",
      genericName: "Paracétamol",
      form: "TABLET",
      dosage: "500 mg",
      category: "Antalgique",
      manufacturer: "UPSA",
      createdBy: amel._id,
    },
    {
      name: "Amoxicilline",
      genericName: "Amoxicilline",
      form: "CAPSULE",
      dosage: "1 g",
      category: "Antibiotique",
      requiresPrescription: true,
      manufacturer: "Biogaran",
      createdBy: amel._id,
    },
    {
      name: "Ibuprofène",
      genericName: "Ibuprofène",
      form: "TABLET",
      dosage: "400 mg",
      category: "Anti-inflammatoire",
      manufacturer: "Advil",
      createdBy: amel._id,
    },
    {
      name: "Seringues 5ml stériles (Boîte de 100)",
      form: "OTHER",
      dosage: "5 ml",
      category: "Matériel médical",
      manufacturer: "BD Medical",
      createdBy: amel._id,
    },
    {
      name: "Coton hydrophile chirurgical",
      form: "OTHER",
      dosage: "500 g",
      category: "Consommable",
      manufacturer: "Hartmann",
      createdBy: amel._id,
    },
    {
      name: "Rouleau drap d'examen papier",
      form: "OTHER",
      dosage: "50 x 38 cm",
      category: "Consommable",
      manufacturer: "LCH Médical",
      createdBy: amel._id,
    },
    {
      name: "Alcool dénaturé à 70°",
      form: "DROPS",
      dosage: "250 ml",
      category: "Antiseptique",
      manufacturer: "Gilbert",
      createdBy: amel._id,
    },
    {
      name: "Compresses stériles 10x10",
      form: "OTHER",
      dosage: "10 x 10 cm",
      category: "Consommable",
      manufacturer: "Hartmann",
      createdBy: amel._id,
    },
  ]);

  // Stock Dr Amel Ben Salem
  const stockItemsAmel = await StockItem.insertMany([
    {
      doctorId: amel._id,
      medicationId: para._id,
      quantity: 40,
      lowStockThreshold: 10,
      unit: "boîte",
      location: "Armoire Pharmacie - Étagère 1",
      batches: [{ batchNumber: "LOT-PAR-2026", quantity: 40, expiresAt: new Date("2027-06-30") }],
    },
    {
      doctorId: amel._id,
      medicationId: amox._id,
      quantity: 3,
      lowStockThreshold: 5,
      unit: "boîte",
      location: "Armoire Pharmacie - Étagère 2",
      batches: [{ batchNumber: "LOT-AMX-2026", quantity: 3, expiresAt: new Date("2026-12-31") }],
    },
    {
      doctorId: amel._id,
      medicationId: seringues._id,
      quantity: 12,
      lowStockThreshold: 5,
      unit: "boîte",
      location: "Salle de soins - Tiroir A",
      batches: [{ batchNumber: "LOT-SRG-102", quantity: 12, expiresAt: new Date("2028-01-15") }],
    },
    {
      doctorId: amel._id,
      medicationId: coton._id,
      quantity: 2,
      lowStockThreshold: 5,
      unit: "rouleau",
      location: "Salle de soins - Étagère Basse",
      batches: [{ batchNumber: "LOT-CTN-88", quantity: 2, expiresAt: new Date("2028-10-01") }],
    },
    {
      doctorId: amel._id,
      medicationId: drap._id,
      quantity: 0,
      lowStockThreshold: 3,
      unit: "rouleau",
      location: "Salle de consultation - Table d'examen",
      batches: [],
    },
    {
      doctorId: amel._id,
      medicationId: alcool._id,
      quantity: 1,
      lowStockThreshold: 3,
      unit: "flacon",
      location: "Chariot de soins",
      // Expire très prochainement (dans ~2 semaines pour déclencher l'alerte de péremption)
      batches: [{ batchNumber: "LOT-ALC-70", quantity: 1, expiresAt: new Date("2026-11-15") }],
    },
    {
      doctorId: amel._id,
      medicationId: compresses._id,
      quantity: 45,
      lowStockThreshold: 10,
      unit: "sachet",
      location: "Salle de soins - Tiroir B",
      batches: [{ batchNumber: "LOT-CMP-2026", quantity: 45, expiresAt: new Date("2027-09-20") }],
    },
  ]);

  // Initialisation de quelques mouvements d'historique pour le Dr Amel
  for (const s of stockItemsAmel) {
    if (s.quantity > 0) {
      await StockMovement.create({
        stockItemId: s._id,
        doctorId: amel._id,
        type: "IN",
        quantity: s.quantity,
        batchNumber: s.batches[0]?.batchNumber,
        reason: "Inventaire et stock initial du cabinet",
        createdBy: amel._id,
      });
    }
  }

  // Mouvement de sortie exemple pour le drap d'examen (expliquant la rupture)
  const drapStock = stockItemsAmel.find((s) => s.quantity === 0);
  if (drapStock) {
    await StockMovement.create({
      stockItemId: drapStock._id,
      doctorId: amel._id,
      type: "OUT",
      quantity: 5,
      reason: "Utilisation complète en consultations quotidiennes",
      createdBy: amel._id,
    });
  }

  console.log("✔ Données de démonstration créées (y compris le stock et matériel médical).");
}

main()
  .catch((e) => {
    console.error("✘ Seed échoué :", e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
