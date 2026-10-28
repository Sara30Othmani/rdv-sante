const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let failures = 0;
const ok = (c, m, extra = "") => { console.log((c ? "OK   " : "FAIL ") + m + (c ? "" : "  " + extra)); if (!c) failures++; };

const users = await (await fetch(`${BASE}/api/users`)).json();
const U = Object.fromEntries(users.map(u => [u.name.split(" ")[0].replace("Dr.", "") || u.name, u]));
const by = (n) => users.find(u => u.name.includes(n));
const sarra = by("Sarra"), ahmed = by("Ahmed"), amel = by("Amel"), yassine = by("Yassine"), mariem = by("Mariem");

const call = async (user, method, path, body) => {
  const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(user ? { "x-user-id": user.id } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
};

// --- authentification
ok((await call(null, "GET", "/api/doctors")).status === 401, "sans identité → 401");
ok((await call({ id: "123" }, "GET", "/api/doctors")).status === 401, "identité invalide → 401");

// --- médecins
const docs = (await call(sarra, "GET", "/api/doctors")).data;
ok(docs.length === 3, "3 médecins vérifiés");
const dAmel = docs.find(d => d.name.includes("Amel"));
ok(dAmel.ratingAvg === 5 && dAmel.ratingCount === 1 && dAmel.reservations === 1 && dAmel.initials === "AB", "note, réservations et initiales de Dr Amel", JSON.stringify(dAmel));

// --- rendez-vous : lecture limitée à son profil
const sa = (await call(sarra, "GET", "/api/appointments")).data;
const ah = (await call(ahmed, "GET", "/api/appointments")).data;
ok(sa.length === 3 && sa.every(a => a.patientId === sarra.id), "Sarra voit seulement ses 3 rendez-vous");
ok(ah.length === 2 && ah.every(a => a.patientId === ahmed.id), "Ahmed voit seulement ses 2 rendez-vous");
const am = (await call(amel, "GET", "/api/appointments")).data;
ok(am.length === 3 && am.every(a => a.doctorId === amel.id), "Dr Amel voit seulement ses rendez-vous");

// --- rendez-vous : création
const slot = { doctorId: amel.id, date: "2026-12-01", time: "10:00", reason: "Contrôle annuel" };
const c1 = await call(sarra, "POST", "/api/appointments", slot);
ok(c1.status === 201 && c1.data.status === "En attente" && c1.data.patientName === sarra.name && c1.data.specialty === "Cardiologie", "création → 201, En attente, nom/spécialité fixés par le serveur", JSON.stringify(c1));
ok((await call(ahmed, "POST", "/api/appointments", slot)).status === 409, "même créneau déjà pris → 409");
ok((await call(sarra, "POST", "/api/appointments", { ...slot, time: "12:00" })).status === 400, "créneau non proposé → 400");
ok((await call(sarra, "POST", "/api/appointments", { ...slot, date: "2020-01-01", time: "11:00" })).status === 400, "date passée → 400");
ok((await call(sarra, "POST", "/api/appointments", { ...slot, time: "11:00", reason: "ab" })).status === 400, "motif trop court → 400");
ok((await call(mariem, "POST", "/api/appointments", slot)).status === 403, "un médecin ne peut pas réserver → 403");
ok((await call(sarra, "POST", "/api/appointments", { ...slot, doctorId: sarra.id, time: "11:00" })).status === 404, "réserver chez un non-médecin → 404");

// --- rendez-vous : modifications par le patient
const myNew = c1.data.id;
ok((await call(sarra, "PATCH", `/api/appointments/${myNew}`, { status: "Terminé" })).status === 403, "patient ne peut pas se mettre 'Terminé' → 403");
ok((await call(sarra, "PATCH", `/api/appointments/${myNew}`, { notes: "x" })).status === 403, "patient ne peut pas écrire des notes → 403");
ok((await call(ahmed, "PATCH", `/api/appointments/${myNew}`, { reason: "piratage !" })).status === 404, "rendez-vous d'un autre patient → 404");
ok((await call(yassine, "PATCH", `/api/appointments/${myNew}`, { status: "Accepté" })).status === 404, "autre médecin → 404");

// --- rendez-vous : le médecin
ok((await call(amel, "PATCH", `/api/appointments/${myNew}`, { date: "2026-12-02" })).status === 403, "médecin ne change pas la date → 403");
ok((await call(amel, "PATCH", `/api/appointments/${myNew}`, { status: "Terminé" })).status === 409, "En attente → Terminé interdit → 409");
ok((await call(amel, "PATCH", `/api/appointments/${myNew}`, { notes: "trop tôt" })).status === 409, "notes avant acceptation → 409");
const acc = await call(amel, "PATCH", `/api/appointments/${myNew}`, { status: "Accepté" });
ok(acc.status === 200 && acc.data.status === "Accepté", "médecin accepte → 200");
const withNote = await call(amel, "PATCH", `/api/appointments/${myNew}`, { notes: "Prévoir ECG" });
ok(withNote.status === 200 && withNote.data.notes === "Prévoir ECG", "médecin ajoute une note → 200");

// --- le patient déplace un rendez-vous accepté → repasse en attente
const moved = await call(sarra, "PATCH", `/api/appointments/${myNew}`, { date: "2026-12-03", time: "11:00" });
ok(moved.status === 200 && moved.data.status === "En attente" && moved.data.date === "2026-12-03", "déplacer un RDV accepté → repasse 'En attente'", JSON.stringify(moved));
ok((await call(sarra, "PATCH", `/api/appointments/${myNew}`, { time: "16:00" })).status === 400, "déplacer sur un créneau non proposé → 400");
const cancel = await call(sarra, "PATCH", `/api/appointments/${myNew}`, { status: "Annulé" });
ok(cancel.status === 200 && cancel.data.status === "Annulé", "patient annule → 200");
ok((await call(sarra, "PATCH", `/api/appointments/${myNew}`, { reason: "encore modifié" })).status === 409, "RDV annulé non modifiable → 409");
// le créneau annulé est de nouveau libre
ok((await call(ahmed, "POST", "/api/appointments", { ...slot, date: "2026-12-03", time: "11:00" })).status === 201, "créneau annulé de nouveau réservable → 201");

// --- feedbacks : visibilité
const fSarra = (await call(sarra, "GET", "/api/feedbacks")).data;
const fAhmed = (await call(ahmed, "GET", "/api/feedbacks")).data;
const fAmel = (await call(amel, "GET", "/api/feedbacks")).data;
const fYass = (await call(yassine, "GET", "/api/feedbacks")).data;
ok(fSarra.length === 1 && fSarra[0].type === "COMPLAINT", "Sarra voit sa réclamation seulement");
ok(fAhmed.length === 1 && fAhmed[0].type === "REVIEW", "Ahmed voit son avis seulement");
ok(fAmel.length === 1 && fAmel[0].user_name === ahmed.name, "Dr Amel voit l'avis reçu seulement");
ok(fYass.length === 1 && fYass[0].id === "demo-complaint-1", "Dr Yassine voit la réclamation reçue");
ok((await call(ahmed, "GET", "/api/feedbacks/demo-complaint-1")).status === 404, "feedback d'un autre → 404");
ok((await call(mariem, "GET", "/api/feedbacks")).data.length === 0, "Dr Mariem n'a rien reçu");

// --- feedbacks : création d'un avis (patient)
const apptDoneAmel = sa.find(a => a.status === "Terminé" && a.doctorId === amel.id);
const apptPending = sa.find(a => a.status === "En attente");
const review = { type: "REVIEW", rating: 4, content: "Consultation claire et rassurante.", appointment_id: apptDoneAmel.id, doctor_id: yassine.id /* mensonge */ };
const r1 = await call(sarra, "PUT", "/api/feedbacks/uuid-review-1", review);
ok(r1.status === 201 && r1.data.doctor_id === amel.id && r1.data.user_id === sarra.id, "avis créé ; médecin déduit du rendez-vous (pas du corps)", JSON.stringify(r1));
ok((await call(sarra, "PUT", "/api/feedbacks/uuid-review-1", { ...review, content: "Contenu modifié, toujours assez long." })).status === 200, "même clientId = mise à jour (idempotent)");
ok((await call(sarra, "PUT", "/api/feedbacks/uuid-review-2", review)).status === 409, "deuxième avis pour le même RDV → 409");
ok((await call(sarra, "PUT", "/api/feedbacks/uuid-review-3", { ...review, appointment_id: apptPending.id })).status === 400, "avis sur un RDV non terminé → 400");
ok((await call(sarra, "PUT", "/api/feedbacks/uuid-review-4", { ...review, appointment_id: ah[0].id })).status === 404, "avis sur le RDV d'un autre → 404");
ok((await call(sarra, "PUT", "/api/feedbacks/uuid-review-5", { ...review, rating: 9, appointment_id: apptPending.id })).status === 400, "note 9 → 400");
ok((await call(amel, "PUT", "/api/feedbacks/uuid-x", review)).status === 403, "un médecin ne crée pas de feedback → 403");

// --- note moyenne recalculée
const docs2 = (await call(sarra, "GET", "/api/doctors")).data;
const dAmel2 = docs2.find(d => d.name.includes("Amel"));
ok(dAmel2.ratingCount === 2 && Math.abs(dAmel2.ratingAvg - 4.5) < 1e-9, "note moyenne Dr Amel = 4,5 (5 et 4)", JSON.stringify(dAmel2));

// --- feedbacks : réponse du médecin et statut
const resp = await call(yassine, "PUT", "/api/feedbacks/demo-complaint-1", { response: "Nous nous excusons pour l'attente.", status: "IN_PROGRESS" });
ok(resp.status === 200 && resp.data.status === "IN_PROGRESS" && resp.data.response.startsWith("Nous"), "médecin répond + OPEN → IN_PROGRESS");
ok((await call(yassine, "PUT", "/api/feedbacks/demo-complaint-1", { status: "CLOSED" })).status === 409, "saut de statut IN_PROGRESS → CLOSED interdit → 409");
ok((await call(mariem, "PUT", "/api/feedbacks/demo-complaint-1", { response: "intrus !" })).status === 404, "autre médecin → 404");
ok((await call(yassine, "DELETE", "/api/feedbacks/demo-complaint-1")).status === 403, "le médecin ne supprime pas une réclamation → 403");
ok((await call(sarra, "PUT", "/api/feedbacks/demo-complaint-1", { content: "Je réécris tout après la réponse." })).status === 403, "patient ne modifie plus une réclamation en cours → 403");
ok((await call(sarra, "DELETE", "/api/feedbacks/demo-complaint-1")).status === 403, "patient ne supprime plus une réclamation en cours → 403");
ok((await call(yassine, "PUT", "/api/feedbacks/uuid-review-1", { response: "hors sujet" })).status === 404, "avis d'un autre médecin → 404");

// --- suppression par l'auteur
ok((await call(ahmed, "DELETE", "/api/feedbacks/uuid-review-1")).status === 404, "supprimer l'avis d'un autre → 404");
ok((await call(amel, "DELETE", "/api/feedbacks/uuid-review-1")).status === 403, "le médecin ne supprime pas un avis reçu → 403");
ok((await call(sarra, "DELETE", "/api/feedbacks/uuid-review-1")).status === 204, "l'auteur supprime son avis → 204");
ok((await call(sarra, "GET", "/api/feedbacks/uuid-review-1")).status === 404, "avis supprimé → 404");

// ============================================================
// --- Module 3 : Gestion du stock médecin (Amira)
// ============================================================
console.log("\n--- Tests Module 3 : Gestion du stock médecin ---");

// Accès & Droits
ok((await call(null, "GET", "/api/stock")).status === 401, "stock sans identité → 401");
ok((await call(sarra, "GET", "/api/stock")).status === 403, "patient ne peut pas accéder au stock médecin → 403");
ok((await call(sarra, "POST", "/api/stock", { name: "Test", quantity: 5 })).status === 403, "patient ne peut pas ajouter au stock → 403");

// Consultation du stock par le médecin
const stockRes = await call(amel, "GET", "/api/stock");
ok(stockRes.status === 200, "Dr Amel accède à son stock → 200");
ok(stockRes.data.items && Array.isArray(stockRes.data.items), "liste des articles renvoyée");
ok(stockRes.data.kpis && typeof stockRes.data.kpis.totalItems === "number", "kpis du stock renvoyés");
ok(stockRes.data.kpis.lowStockCount > 0, "détection d'articles en stock faible");
ok(stockRes.data.kpis.outOfStockCount > 0, "détection des ruptures de stock");
ok(stockRes.data.kpis.expiringCount > 0, "détection des articles proches de l'expiration");

// Ajout d'un nouvel article (matériel médical / seringues / consommables)
const newSupply = {
  name: "Gants stériles en latex (Boîte de 100)",
  category: "Hygiène & Protection",
  form: "OTHER",
  dosage: "Taille M",
  quantity: 25,
  lowStockThreshold: 10,
  unit: "boîte",
  location: "Armoire B - Étagère 1",
  batchNumber: "LOT-GLV-2026",
  expiresAt: "2027-12-31",
};

const addRes = await call(amel, "POST", "/api/stock", newSupply);
ok(addRes.status === 201, "ajout d'un nouvel article de matériel au stock → 201");
const addedId = addRes.data.id;
ok(addRes.data.medication.name === newSupply.name, "nom de l'article enregistré");
ok(addRes.data.quantity === 25 && addRes.data.status === "IN_STOCK", "quantité et statut 'IN_STOCK' corrects");

// Définir / modifier le seuil minimal d'alerte
const threshRes = await call(amel, "PATCH", `/api/stock/${addedId}`, { lowStockThreshold: 30 });
ok(threshRes.status === 200 && threshRes.data.lowStockThreshold === 30, "définir un nouveau seuil minimal → 200");
ok(threshRes.data.status === "LOW_STOCK", "statut passe en 'LOW_STOCK' car quantité (25) ≤ seuil (30)");

// Modifier la quantité : sortie de stock (soin)
const outRes = await call(amel, "PATCH", `/api/stock/${addedId}`, {
  action: "OUT",
  movementQuantity: 5,
  reason: "Utilisé lors des consultations de la journée",
  batchNumber: "LOT-GLV-2026",
});
ok(outRes.status === 200 && outRes.data.quantity === 20, "sortie de 5 boîtes → stock = 20");

// Historique des mouvements
const movRes = await call(amel, "GET", `/api/stock/${addedId}/movements`);
ok(movRes.status === 200 && movRes.data.length >= 2, "historique des mouvements tracé (entrée initiale + sortie)");
ok(movRes.data[0].type === "OUT" && movRes.data[0].quantity === 5, "dernier mouvement enregistré est la sortie de 5");

// Contrôle de sécurité : un autre médecin ne peut pas modifier cet article
ok((await call(yassine, "PATCH", `/api/stock/${addedId}`, { action: "OUT", movementQuantity: 1 })).status === 404, "autre médecin ne peut pas modifier l'article d'Amel → 404");

// Supprimer l'article du stock
const delRes = await call(amel, "DELETE", `/api/stock/${addedId}`);
ok(delRes.status === 200, "suppression de l'article du stock → 200");
ok((await call(amel, "GET", `/api/stock/${addedId}`)).status === 404, "article supprimé introuvable → 404");

console.log(failures === 0 ? "\nTOUS LES TESTS PASSENT" : `\n${failures} ÉCHEC(S)`);
process.exit(failures ? 1 : 0);
