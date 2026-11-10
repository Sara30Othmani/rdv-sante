/**
 * Jeu de données de démarrage complet et ultra-réaliste : npm run seed
 * Initialise : Utilisateurs (avec mots de passe hachés bcrypt), Profils médecins,
 * Rendez-vous, Feedbacks, Catalogue médicaments, Stock & Mouvements, Ordonnances.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/mongodb";
import UserModel from "../models/User";
import DoctorProfile from "../models/DoctorProfile";
import Appointment from "../models/Appointment";
import FeedbackModel from "../models/Feedback";
import Medication from "../models/Medication";
import StockItem from "../models/StockItem";
import StockMovement from "../models/StockMovement";
import Prescription from "../models/Prescription";
import ForumPost from "../models/ForumPost";
import ForumComment from "../models/ForumComment";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed interdit en production.");
  }
  await connectDB();

  console.log("Nettoyage des collections...");
  await Promise.all([
    UserModel.deleteMany({}),
    DoctorProfile.deleteMany({}),
    Appointment.deleteMany({}),
    FeedbackModel.deleteMany({}),
    Medication.deleteMany({}),
    StockItem.deleteMany({}),
    StockMovement.deleteMany({}),
    Prescription.deleteMany({}),
    ForumPost.deleteMany({}),
    ForumComment.deleteMany({}),
  ]);

  console.log("Création des utilisateurs...");
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // ---- 1. Utilisateurs
  const [sarra, ahmed, amel, yassine, mariem] = await UserModel.insertMany([
    {
      name: "Sarra Ben Ali",
      email: "sarra@demo.tn",
      passwordHash,
      role: "PATIENT",
      phone: "+216 98 123 456",
      birthDate: new Date("1994-05-14"),
      emailVerified: true,
      isActive: true,
    },
    {
      name: "Ahmed Mansour",
      email: "ahmed@demo.tn",
      passwordHash,
      role: "PATIENT",
      phone: "+216 97 654 321",
      birthDate: new Date("1988-11-23"),
      emailVerified: true,
      isActive: true,
    },
    {
      name: "Dr. Amel Ben Salem",
      email: "amel@demo.tn",
      passwordHash,
      role: "DOCTOR",
      phone: "+216 71 800 900",
      emailVerified: true,
      isActive: true,
    },
    {
      name: "Dr. Yassine Trabelsi",
      email: "yassine@demo.tn",
      passwordHash,
      role: "DOCTOR",
      phone: "+216 71 800 901",
      emailVerified: true,
      isActive: true,
    },
    {
      name: "Dr. Mariem Gharbi",
      email: "mariem@demo.tn",
      passwordHash,
      role: "DOCTOR",
      phone: "+216 71 800 902",
      emailVerified: true,
      isActive: true,
    },
  ]);

  // ---- 2. Profils médecins
  await DoctorProfile.insertMany([
    {
      userId: amel._id,
      specialty: "Cardiologie",
      address: "15 Avenue Habib Bourguiba",
      city: "Tunis",
      price: 80,
      availableSlots: ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "15:00"],
      verified: true,
      isModerator: true,
      licenseNumber: "MED-TN-2024-001",
    },
    {
      userId: yassine._id,
      specialty: "Dermatologie",
      address: "24 Rue de la Liberté",
      city: "Ariana",
      price: 60,
      availableSlots: ["09:00", "09:30", "11:00", "11:30", "15:00", "16:00"],
      verified: true,
      isModerator: false,
      licenseNumber: "MED-TN-2024-002",
    },
    {
      userId: mariem._id,
      specialty: "Médecine générale",
      address: "8 Avenue Habib Thameur",
      city: "La Marsa",
      price: 50,
      availableSlots: ["08:30", "10:00", "10:30", "13:30", "14:30"],
      verified: true,
      isModerator: false,
      licenseNumber: "MED-TN-2024-003",
    },
  ]);

  // ---- 3. Rendez-vous de consultation
  const [apptPending, apptAccepted, done1, done2, done3] = await Appointment.insertMany([
    {
      patientId: sarra._id,
      patientName: sarra.name,
      doctorId: amel._id,
      doctorName: amel.name,
      specialty: "Cardiologie",
      date: "2026-11-15",
      time: "10:00",
      reason: "Consultation de contrôle cardiologique",
      status: "PENDING",
      price: 80,
    },
    {
      patientId: ahmed._id,
      patientName: ahmed.name,
      doctorId: yassine._id,
      doctorName: yassine.name,
      specialty: "Dermatologie",
      date: "2026-11-18",
      time: "11:30",
      reason: "Examen des grains de beauté",
      status: "ACCEPTED",
      price: 60,
    },
    {
      patientId: sarra._id,
      patientName: sarra.name,
      doctorId: yassine._id,
      doctorName: yassine.name,
      specialty: "Dermatologie",
      date: "2026-10-12",
      time: "09:30",
      reason: "Contrôle dermatologique annuel",
      status: "DONE",
      notes: "Aucune anomalie suspecte détectée sur le dos ni le visage.",
      price: 60,
    },
    {
      patientId: ahmed._id,
      patientName: ahmed.name,
      doctorId: amel._id,
      doctorName: amel.name,
      specialty: "Cardiologie",
      date: "2026-10-20",
      time: "14:00",
      reason: "Bilan cardiaque complet et électrocardiogramme",
      status: "DONE",
      notes: "Tension artérielle 12/8. Rythme sinusal régulier. Traitement léger prescrit.",
      price: 80,
    },
    {
      patientId: sarra._id,
      patientName: sarra.name,
      doctorId: amel._id,
      doctorName: amel.name,
      specialty: "Cardiologie",
      date: "2026-09-03",
      time: "11:00",
      reason: "Palpitations à l'effort",
      status: "DONE",
      notes: "ECG normal, bilan sanguin de contrôle demandé.",
      price: 80,
    },
  ]);

  // ---- 4. Feedbacks
  await FeedbackModel.insertMany([
    {
      clientId: "demo-review-1",
      userId: ahmed._id,
      userName: ahmed.name,
      doctorId: amel._id,
      doctorName: amel.name,
      appointmentId: done2._id,
      type: "REVIEW",
      rating: 5,
      content: "Excellente cardiologue, très rassurante et professionnelle.",
      status: "RESOLVED",
    },
    {
      clientId: "demo-complaint-1",
      userId: sarra._id,
      userName: sarra.name,
      doctorId: yassine._id,
      doctorName: yassine.name,
      appointmentId: done1._id,
      type: "COMPLAINT",
      subject: "Léger retard de consultation",
      content: "Près de 30 minutes de retard sur l'horaire prévu.",
      status: "CLOSED",
      response: "Nous nous excusons pour ce délai lié à une urgence antérieure.",
    },
  ]);

  console.log("Création du catalogue de médicaments...");
  // ---- 5. Module : Catalogue Médicaments
  const [
    para,
    amox,
    ibup,
    seringues,
    coton,
    drap,
    alcool,
    compresses,
    spasfon,
    doliprane,
  ] = await Medication.insertMany([
    {
      name: "Paracétamol",
      genericName: "Paracétamol",
      form: "TABLET",
      dosage: "500 mg",
      category: "Antalgique",
      manufacturer: "UPSA",
      requiresPrescription: false,
      contraindications: ["Insuffisance hépatique sévère", "Allergie au paracétamol"],
      sideEffects: ["Rares réactions allergiques cutanées"],
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
      contraindications: ["Allergie aux bêtalactamines / pénicillines", "Mononucléose infectieuse"],
      sideEffects: ["Troubles digestifs légers", "Diarrhée", "Éruption cutanée"],
      createdBy: amel._id,
    },
    {
      name: "Ibuprofène",
      genericName: "Ibuprofène",
      form: "TABLET",
      dosage: "400 mg",
      category: "Anti-inflammatoire",
      requiresPrescription: false,
      manufacturer: "Advil",
      contraindications: ["Ulcère gastrique évolutif", "Grossesse à partir du 6e mois", "Insuffisance rénale sévère"],
      sideEffects: ["Brûlures d'estomac", "Nausées", "Céphalées"],
      createdBy: amel._id,
    },
    {
      name: "Seringues 5ml",
      genericName: "Seringues 5ml (Stériles)",
      form: "OTHER",
      dosage: "5 ml",
      category: "Matériel médical",
      manufacturer: "BD Medical",
      requiresPrescription: false,
      contraindications: ["Usage unique uniquement", "Ne pas réutiliser"],
      createdBy: amel._id,
    },
    {
      name: "Coton hydrophile chirurgical",
      genericName: "Coton hydrophile",
      form: "OTHER",
      dosage: "500 g",
      category: "Consommable",
      manufacturer: "Hartmann",
      requiresPrescription: false,
      createdBy: amel._id,
    },
    {
      name: "Rouleau drap d'examen papier",
      genericName: "Drap d'examen",
      form: "OTHER",
      dosage: "50 x 38 cm",
      category: "Consommable",
      manufacturer: "LCH Médical",
      requiresPrescription: false,
      createdBy: amel._id,
    },
    {
      name: "Alcool dénaturé à 70°",
      genericName: "Éthanol 70%",
      form: "DROPS",
      dosage: "250 ml",
      category: "Antiseptique",
      manufacturer: "Gilbert",
      requiresPrescription: false,
      contraindications: ["Ne pas appliquer sur les plaies ouvertes profondes", "Usage cutané externe"],
      createdBy: amel._id,
    },
    {
      name: "Compresses stériles 10x10",
      genericName: "Compresses de gaze",
      form: "OTHER",
      dosage: "10 x 10 cm",
      category: "Consommable",
      manufacturer: "Hartmann",
      requiresPrescription: false,
      createdBy: amel._id,
    },
    {
      name: "Spasfon",
      genericName: "Phloroglucinol",
      form: "TABLET",
      dosage: "80 mg",
      category: "Antispasmodique",
      manufacturer: "Teva",
      requiresPrescription: false,
      contraindications: ["Allergie au phloroglucinol"],
      createdBy: amel._id,
    },
    {
      name: "Doliprane 1000mg",
      genericName: "Paracétamol",
      form: "TABLET",
      dosage: "1000 mg",
      category: "Antalgique",
      manufacturer: "Sanofi",
      requiresPrescription: false,
      contraindications: ["Insuffisance hépatique"],
      createdBy: amel._id,
    },
  ]);

  console.log("Création du stock et des mouvements pour le Dr Amel Ben Salem...");
  // ---- 6. Stock médical du cabinet Dr Amel Ben Salem (conforme à l'exemple demandé dans le prompt)
  const [srgStock, paraStock, amoxStock, ctnStock, drapStock, alcStock, compStock] =
    await StockItem.insertMany([
      {
        doctorId: amel._id,
        medicationId: seringues._id,
        quantity: 45, // Exactement 45 unités comme dans l'exemple
        lowStockThreshold: 20, // Seuil 20 unités (Statut: OK ✅)
        unit: "unités",
        location: "Armoire B, Étagère 2", // Exactement comme l'exemple
        batches: [
          {
            batchNumber: "SRG-2024",
            quantity: 120, // Lot #SRG-2024 (120 unités) — Expire le 15/12/2026
            expiresAt: new Date("2026-12-15"),
          },
        ],
      },
      {
        doctorId: amel._id,
        medicationId: para._id,
        quantity: 40,
        lowStockThreshold: 10,
        unit: "boîte",
        location: "Armoire Pharmacie, Étagère 1",
        batches: [
          {
            batchNumber: "LOT-PAR-2026",
            quantity: 40,
            expiresAt: new Date("2027-06-30"),
          },
        ],
      },
      {
        doctorId: amel._id,
        medicationId: amox._id,
        quantity: 3, // Stock bas !
        lowStockThreshold: 5,
        unit: "boîte",
        location: "Armoire Pharmacie, Étagère 2",
        batches: [
          {
            batchNumber: "LOT-AMX-2026",
            quantity: 3,
            expiresAt: new Date("2026-12-31"),
          },
        ],
      },
      {
        doctorId: amel._id,
        medicationId: coton._id,
        quantity: 2,
        lowStockThreshold: 5,
        unit: "rouleau",
        location: "Salle de soins, Étagère Basse",
        batches: [
          {
            batchNumber: "LOT-CTN-88",
            quantity: 2,
            expiresAt: new Date("2028-10-01"),
          },
        ],
      },
      {
        doctorId: amel._id,
        medicationId: drap._id,
        quantity: 0, // Rupture critique !
        lowStockThreshold: 3,
        unit: "rouleau",
        location: "Salle de consultation, Table d'examen",
        batches: [],
      },
      {
        doctorId: amel._id,
        medicationId: alcool._id,
        quantity: 1,
        lowStockThreshold: 3,
        unit: "flacon",
        location: "Chariot de soins",
        // Expire très prochainement (dans quelques jours) pour les alertes
        batches: [
          {
            batchNumber: "LOT-ALC-70",
            quantity: 1,
            expiresAt: new Date("2026-11-20"),
          },
        ],
      },
      {
        doctorId: amel._id,
        medicationId: compresses._id,
        quantity: 45,
        lowStockThreshold: 10,
        unit: "sachet",
        location: "Salle de soins, Tiroir B",
        batches: [
          {
            batchNumber: "LOT-CMP-2026",
            quantity: 45,
            expiresAt: new Date("2027-09-20"),
          },
        ],
      },
    ]);

  // ---- 7. Mouvements de stock (IN et OUT pour calculer la consommation ~15 unités/semaine des seringues)
  await StockMovement.insertMany([
    // Entrée initiale Seringues
    {
      stockItemId: srgStock._id,
      doctorId: amel._id,
      type: "IN",
      quantity: 100,
      batchNumber: "SRG-2024",
      reason: "Livraison fournisseur BD Medical",
      createdBy: amel._id,
    },
    // Sorties consécutives pour créer une consommation moyenne d'environ 15 unités / semaine
    {
      stockItemId: srgStock._id,
      doctorId: amel._id,
      type: "OUT",
      quantity: 15,
      batchNumber: "SRG-2024",
      reason: "Utilisation prélèvements sanguins et injections hebdomadaires",
      createdBy: amel._id,
    },
    {
      stockItemId: srgStock._id,
      doctorId: amel._id,
      type: "OUT",
      quantity: 15,
      batchNumber: "SRG-2024",
      reason: "Actes de soins infirmiers et consultations",
      createdBy: amel._id,
    },
    {
      stockItemId: srgStock._id,
      doctorId: amel._id,
      type: "OUT",
      quantity: 15,
      batchNumber: "SRG-2024",
      reason: "Actes de soins au cabinet",
      createdBy: amel._id,
    },
    // Sortie pour expliquer la rupture des draps
    {
      stockItemId: drapStock._id,
      doctorId: amel._id,
      type: "OUT",
      quantity: 5,
      reason: "Utilisation complète en consultations quotidiennes",
      createdBy: amel._id,
    },
    // Entrée Paracétamol
    {
      stockItemId: paraStock._id,
      doctorId: amel._id,
      type: "IN",
      quantity: 40,
      batchNumber: "LOT-PAR-2026",
      reason: "Réapprovisionnement pharmacie",
      createdBy: amel._id,
    },
  ]);

  console.log("Création des ordonnances délivrées après consultation...");
  // ---- 8. Module : Ordonnances médicales
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  await Prescription.insertMany([
    {
      appointmentId: done2._id, // Bilan cardiaque Ahmed Mansour
      patientId: ahmed._id,
      doctorId: amel._id,
      items: [
        {
          medicationId: para._id,
          dosage: "500 mg",
          frequency: "1 comprimé 3 fois par jour en cas de douleur ou fièvre",
          durationDays: 5,
          instructions: "Espacer les prises de 6 heures minimum. Ne pas dépasser 3g par jour.",
        },
        {
          medicationId: amox._id,
          dosage: "1 g",
          frequency: "1 gélule matin et soir",
          durationDays: 7,
          instructions: "À prendre au début des repas avec un grand verre d'eau. Finir la boîte.",
        },
      ],
      issuedAt: new Date("2026-10-20T14:30:00Z"),
      validUntil: threeMonthsLater,
      status: "ACTIVE",
    },
    {
      appointmentId: done3._id, // Consultation Sarra Ben Ali
      patientId: sarra._id,
      doctorId: amel._id,
      items: [
        {
          medicationId: para._id,
          dosage: "500 mg",
          frequency: "1 comprimé matin et soir si besoin",
          durationDays: 3,
          instructions: "Pendant les repas.",
        },
        {
          medicationId: spasfon._id,
          dosage: "80 mg",
          frequency: "2 comprimés en cas de spasmes",
          durationDays: 5,
          instructions: "À laisser fondre sous la langue ou dissoudre dans un verre d'eau.",
        },
      ],
      issuedAt: new Date("2026-09-03T11:45:00Z"),
      validUntil: threeMonthsLater,
      status: "ACTIVE",
    },
  ]);

  console.log("Création des posts du forum...");
  // ---- 9. Forum Posts (modèle Mongoose)
  const post1 = await ForumPost.create({
    authorId: ahmed._id,
    authorName: "Ahmed Mansour",
    authorRole: "PATIENT",
    title: "Comment préparer une première consultation avec un cardiologue ?",
    content: "Je vais voir un cardiologue pour la première fois. Quels documents faut-il apporter au rendez-vous et faut-il venir à jeun ?",
    category: "Cardiologie",
    isLocked: true, // Clôturé car Dr. Amel a répondu !
    status: "PUBLISHED",
    commentsCount: 1,
  });

  await ForumComment.create({
    postId: post1._id,
    authorId: amel._id,
    authorName: "Dr. Amel Ben Salem",
    authorRole: "DOCTOR",
    content: "Bonjour M. Mansour. Pour un premier bilan cardiologique : apportez votre carte d'assuré, vos ordonnances en cours, vos bilans sanguins récents et tout électrocardiogramme antérieur si vous en possédez. Il n'est pas nécessaire d'être à jeun sauf consigne écrite préalable.",
    status: "PUBLISHED",
  });

  console.log("✔ Base de données initialisée avec succès avec toutes les données requises !");
}

main()
  .catch((e) => {
    console.error("✘ Erreur lors du seed :", e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
