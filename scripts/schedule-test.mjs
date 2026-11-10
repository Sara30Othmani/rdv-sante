const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let failures = 0;
const ok = (c, m, extra = "") => { console.log((c ? "OK   " : "FAIL ") + m + (c ? "" : "  " + extra)); if (!c) failures++; };

const users = await (await fetch(`${BASE}/api/users`)).json();
const by = (n) => users.find((u) => u.name.includes(n));
const sarra = by("Sarra"), ahmed = by("Ahmed"), amel = by("Amel"), mariem = by("Mariem");

const call = async (user, method, path, body) => {
  const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", "x-user-id": user.id }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
};
const book = (u, date, time, doctor = amel) => call(u, "POST", "/api/appointments", { doctorId: doctor.id, date, time, reason: "Consultation de test" });

// --- ancien profil (sans schedule) : repli sur availableSlots, lundi → vendredi
const first = await call(amel, "GET", "/api/schedule");
ok(first.status === 200 && first.data.schedule.days.length === 7 && first.data.schedule.slotMinutes === 30, "profil sans horaires : repli sur l'ancien format", JSON.stringify(first.data));
ok(first.data.schedule.days[2].enabled && !first.data.schedule.days[0].enabled && !first.data.schedule.days[6].enabled, "repli : lundi → vendredi ouverts, week-end fermé");
ok((await book(sarra, "2026-12-08", "10:00")).status === 201, "mardi 10:00 (ancien créneau) → 201");
ok((await book(sarra, "2026-12-12", "10:00")).status === 400, "samedi (fermé) → 400");
ok((await book(sarra, "2026-12-09", "12:00")).status === 400, "mercredi 12:00 (pas un créneau) → 400");

const docs = (await call(sarra, "GET", "/api/doctors")).data;
const dAmel = docs.find((d) => d.name.includes("Amel"));
ok(dAmel.schedule?.days?.length === 7 && dAmel.availableSlots === undefined, "/api/doctors renvoie `schedule` (plus availableSlots)");

// --- droits
ok((await call(sarra, "GET", "/api/schedule")).status === 403, "un patient ne lit pas les horaires médecin → 403");
ok((await call(sarra, "PUT", "/api/schedule", { schedule: first.data.schedule })).status === 403, "un patient ne modifie pas les horaires → 403");

// --- validation
const base = JSON.parse(JSON.stringify(first.data.schedule));
const mod = (fn) => { const s = JSON.parse(JSON.stringify(base)); fn(s); return { schedule: s }; };
const put = (body) => call(amel, "PUT", "/api/schedule", body);
ok((await put(mod((s) => { s.slotMinutes = 25; }))).status === 400, "durée 25 min refusée → 400");
ok((await put(mod((s) => { s.days[1].ranges = [{ start: "09:00", end: "12:00" }, { start: "11:00", end: "14:00" }]; }))).status === 400, "plages qui se chevauchent → 400");
ok((await put(mod((s) => { s.days[1].ranges = [{ start: "12:00", end: "09:00" }]; }))).status === 400, "début après la fin → 400");
ok((await put(mod((s) => { s.days[1].ranges = [{ start: "09:00", end: "09:10" }]; }))).status === 400, "plage plus courte qu'un créneau → 400");
ok((await put(mod((s) => { s.days[1].ranges = []; }))).status === 400, "jour ouvert sans plage → 400");
ok((await put(mod((s) => { s.days.forEach((d) => { d.enabled = false; }); }))).status === 400, "aucun jour ouvert → 400");
ok((await put(mod((s) => { s.days[1].ranges = [1,2,3,4,5].map((i) => ({ start: `0${i}:00`, end: `0${i}:30` })); }))).status === 400, "5 plages dans un jour → 400");
ok((await put(mod((s) => { s.daysOff = ["pas-une-date"]; }))).status === 400, "congé invalide → 400");
ok((await put({})).status === 400, "corps vide → 400");

// --- nouveaux horaires : lundi → mercredi, 8h–12h, créneaux de 20 min, un congé
const next = mod((s) => {
  s.slotMinutes = 20;
  s.days = s.days.map((d, wd) => ({ enabled: wd >= 1 && wd <= 3, ranges: wd >= 1 && wd <= 3 ? [{ start: "08:00", end: "12:00" }] : [] }));
  s.daysOff = ["2026-12-15"];
});
const saved = await put(next);
ok(saved.status === 200 && saved.data.schedule.slotMinutes === 20 && saved.data.schedule.daysOff[0] === "2026-12-15", "horaires enregistrés → 200", JSON.stringify(saved.data));
ok(saved.data.outsideCount >= 1, `RDV existants hors des nouveaux horaires signalés (outsideCount = ${saved.data.outsideCount})`);
const again = await call(amel, "GET", "/api/schedule");
ok(again.data.schedule.days[4].enabled === false && again.data.schedule.days[1].ranges[0].end === "12:00", "relecture identique");

// --- réservation avec les nouveaux horaires
ok((await book(ahmed, "2026-12-16", "08:20")).status === 201, "mercredi 08:20 (grille de 20 min) → 201");
ok((await book(ahmed, "2026-12-16", "09:30")).status === 400, "mercredi 09:30 (hors grille de 20 min) → 400");
ok((await book(ahmed, "2026-12-16", "11:40")).status === 201, "mercredi 11:40 (dernier créneau) → 201");
ok((await book(ahmed, "2026-12-16", "12:00")).status === 400, "mercredi 12:00 (fin de plage) → 400");
ok((await book(ahmed, "2026-12-10", "08:00")).status === 400, "jeudi (désormais fermé) → 400");
ok((await book(ahmed, "2026-12-15", "08:00")).status === 400, "jour de congé → 400");

// --- déplacer un RDV en attente : mêmes règles
const mine = (await call(ahmed, "GET", "/api/appointments")).data.find((a) => a.doctorId === amel.id && a.date === "2026-12-16" && a.time === "08:20");
ok((await call(ahmed, "PATCH", `/api/appointments/${mine.id}`, { date: "2026-12-15", time: "08:00" })).status === 400, "déplacer sur un congé → 400");
ok((await call(ahmed, "PATCH", `/api/appointments/${mine.id}`, { date: "2026-12-21", time: "09:00" })).status === 200, "déplacer sur lundi 09:00 → 200");

// --- un autre médecin n'est pas affecté (repli ancien format)
ok((await book(sarra, "2026-12-10", "08:30", mariem)).status === 201, "Dr Mariem (ancien format) : jeudi 08:30 → 201");

console.log(failures === 0 ? "\nTOUS LES TESTS PASSENT" : `\n${failures} ÉCHEC(S)`);
process.exit(failures ? 1 : 0);
