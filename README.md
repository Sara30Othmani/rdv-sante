# RDV Santé

Application web (PWA) de **prise de rendez-vous médicaux** avec deux profils : **patient** et **médecin**.
Les patients réservent, suivent leurs rendez-vous et laissent des avis ou réclamations ; les médecins gèrent
leurs demandes, répondent aux retours et suivent leur activité sur un tableau de bord.

## Stack technique

- **Next.js 16** (App Router, Cache Components) · **React 19** · **TypeScript**
- **Tailwind CSS 4** + styles du projet dans `app/globals.css`
- **MongoDB** via **Mongoose**
- **IndexedDB** (bibliothèque `idb`) : cache local et file d'attente hors-ligne des feedbacks
- **PWA** : manifest, service worker, bouton d'installation

## Architecture

```
 NAVIGATEUR                                     SERVEUR (Next.js)                 BASE
┌──────────────────────────┐   fetch /api/…   ┌──────────────────────────┐      ┌─────────┐
│ Pages (app/patient,      │ ───────────────► │ Routes API (app/api)     │ ───► │ MongoDB │
│        app/medecin)      │  en-tête         │  1. lib/auth.ts : qui ?  │      │         │
│ Composants, hooks        │  x-user-id       │  2. règles : a-t-il le   │ ◄─── │ models/ │
│                          │ ◄─────────────── │     droit ? (rules.ts)   │      └─────────┘
│ IndexedDB (feedbacks)    │      JSON        │  3. Mongoose (models/)   │
└──────────────────────────┘                  └──────────────────────────┘
```

Principes :

1. **L'URL décide de l'espace** : `/patient/...` ou `/medecin/...`. Un `layout.tsx` par espace monte
   `RoleGuard`, qui vérifie que le profil connecté correspond (sinon « Accès réservé »).
2. **Le serveur fait foi** : les routes `/api` identifient l'utilisateur et appliquent les règles métier.
   L'interface ne fait que masquer des boutons.
3. **Pas d'accès direct à MongoDB depuis le navigateur** : seules les routes API importent Mongoose.
4. **Règles partagées** : `lib/feedbacks/rules.ts` est utilisé à la fois dans le navigateur (affichage) et sur
   le serveur (contrôle).
5. **Hors-ligne d'abord pour les feedbacks** : écriture dans IndexedDB, puis `syncPending()` envoie au serveur
   et récupère la version du serveur (qui fait foi).

### Structure des dossiers

```
app/
  layout.tsx · page.tsx · globals.css        cadre commun, accueil (choix du profil), styles
  patient/                                   espace patient (layout protégé par RoleGuard)
    page.tsx                                 liste des médecins
    rendez-vous/                             liste · nouveau · [id] · [id]/modifier
    feedbacks/                               liste · dashboard · detail · form
  medecin/                                   espace médecin (layout protégé)
    page.tsx                                 tableau de bord (KPI)
    rendez-vous/                             gestion des demandes
    feedbacks/                               liste · dashboard · detail
  api/                                       users · doctors · appointments · feedbacks
components/                                  Sidebar, RoleGuard, KpiCard, PWA… + feedbacks/
lib/                                         logique partagée (voir ci-dessous)
models/                                      schémas Mongoose (1 fichier = 1 collection)
scripts/                                     seed.ts (données de démo) · api-test.mjs (tests)
```

| Fichier `lib/` | Rôle |
|---|---|
| `mongodb.ts` | connexion MongoDB mise en cache |
| `auth.ts` | identifie l'utilisateur côté serveur (**version démo**, à remplacer) |
| `session.ts` | session de démonstration côté navigateur |
| `roles.ts` | correspondance segment d'URL ↔ rôle, routes des feedbacks |
| `api.ts` | `fetch` qui joint l'identité à chaque appel |
| `appointments.ts` | types et statuts des rendez-vous |
| `useAppointments.ts` | hooks de chargement (rendez-vous, médecins) |
| `feedbacks/rules.ts` | règles métier (qui voit, modifie, répond, supprime) |
| `feedbacks/service.ts` | feedbacks hors-ligne et synchronisation |
| `db.ts` | cache local IndexedDB |
| `dto.ts`, `http.ts` | conversion des documents et réponses d'erreur (serveur) |

## Base de données (MongoDB)

Deux rôles seulement : `PATIENT` et `DOCTOR` (pas d'administrateur).

```mermaid
erDiagram
    users ||--o| doctorProfiles : "profil médecin"
    users ||--o{ appointments : "patient ou médecin"
    appointments ||--o{ feedbacks : "concerne"
    appointments ||--o{ prescriptions : "génère"
    prescriptions }o--o{ medications : "items"
    users ||--o{ stockItems : "médecin"
    medications ||--o{ stockItems : "catalogue"
    stockItems ||--o{ stockMovements : "journal"
    users ||--o{ forumPosts : "auteur"
    forumPosts ||--o{ forumComments : "commentaires"
    forumPosts ||--o{ forumReports : "signalements"
```

### Collections utilisées aujourd'hui

| Collection | Contenu | Index importants |
|---|---|---|
| `users` | nom, e-mail, `role`, `isActive` (le mot de passe sera ajouté par le module d'authentification) | `email` unique |
| `doctorProfiles` | spécialité, ville, tarif, créneaux (`availableSlots`), `verified`, `isModerator` | `userId` unique ; `specialty + city` |
| `appointments` | patient, médecin, `date` (AAAA-MM-JJ), `time` (HH:MM), motif, `status`, notes | **unique** `doctorId + date + time` pour les statuts actifs : empêche la double réservation |
| `feedbacks` | `type` (REVIEW / COMPLAINT), note, sujet, contenu, réponse, `status`, `clientId` | `clientId` unique ; **un seul avis par rendez-vous** |

Statuts en base (codes) :
- Rendez-vous : `PENDING` → `ACCEPTED` → `DONE` (ou `REFUSED`, `CANCELLED`)
- Réclamation : `OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`

Choix de modélisation :
- Date et heure en **texte** : aucun décalage de fuseau horaire.
- Noms du patient, du médecin et spécialité **copiés** dans le rendez-vous : l'historique reste stable.
- La **note moyenne** et le nombre de réservations d'un médecin sont **calculés à la volée** (agrégation), pas stockés.
- Les statuts sont stockés en codes anglais ; les libellés français sont dans `lib/appointments.ts`.

### Collections prêtes pour les prochains modules

| Collection | Usage prévu |
|---|---|
| `medications` | catalogue de médicaments (recherche texte, ordonnance requise ou non) |
| `prescriptions` | ordonnance liée à un rendez-vous, avec lignes (médicament, posologie, durée) |
| `stockItems` | stock d'un médecin par médicament, lots et dates de péremption, seuil d'alerte |
| `stockMovements` | journal des entrées/sorties (ajout seul, jamais modifié) |
| `forumPosts`, `forumComments`, `forumReports` | forum, commentaires imbriqués, signalements modérés par des médecins |

## Règles d'accès

| Action | Patient | Médecin |
|---|---|---|
| Lire les rendez-vous | les siens | ceux pris chez lui |
| Créer un rendez-vous | ✅ (créneau proposé, non réservé, non passé) | ❌ |
| Modifier un rendez-vous | date, heure, motif, annulation (tant qu'il n'est pas clôturé) | statut (`PENDING`→`ACCEPTED`/`REFUSED`, `ACCEPTED`→`DONE`) et notes |
| Créer un feedback | ✅ (un avis exige une consultation terminée) | ❌ |
| Modifier / supprimer un feedback | seulement le sien, avis ou réclamation encore ouverte | ❌ (il ne peut pas supprimer un avis négatif) |
| Répondre / changer le statut | ❌ | ✅ pour les feedbacks qui lui sont adressés |

Un accès à la ressource d'un autre utilisateur renvoie **404** (et non 403), pour ne pas révéler son existence.

## API

| Route | Méthodes | Rôle |
|---|---|---|
| `/api/users` | GET | profils de démonstration (désactivé si `ALLOW_DEMO_LOGIN` ≠ `true`) |
| `/api/doctors` | GET | médecins vérifiés, note moyenne, réservations en cours |
| `/api/appointments` | GET, POST | liste (filtrée par profil), création |
| `/api/appointments/[id]` | PATCH | modification selon le rôle |
| `/api/feedbacks` | GET | feedbacks du profil connecté |
| `/api/feedbacks/[id]` | GET, PUT, DELETE | lecture, **création ou mise à jour idempotente** (clé = `clientId`), suppression |

## Mode hors-ligne des feedbacks

1. Création, modification ou suppression : écrites d'abord dans **IndexedDB**, marquées `pending`.
2. `syncPending()` (au chargement, au retour du réseau, après chaque écriture) : envoie les suppressions,
   envoie les créations et modifications (`PUT`), puis **récupère** les feedbacks du serveur.
3. Le serveur fait foi : une modification refusée par ses règles est remplacée par sa version.

Les rendez-vous, eux, nécessitent une connexion.

## Installation

Prérequis : Node.js 20.6 ou plus.

```bash
npm install
npm i -D eslint@9          # si ERESOLVE (eslint-config-next 16 exige ESLint ≥ 9)
npm i mongoose idb
npm i -D tsx
cp .env.example .env.local # puis renseigner MONGODB_URI
```

`.env.local` :

```
MONGODB_URI=mongodb+srv://user:motdepasse@cluster0.xxxxx.mongodb.net/rdv_sante?retryWrites=true&w=majority
# ou en local : mongodb://127.0.0.1:27017/rdv_sante
ALLOW_DEMO_LOGIN=true
```

Charger les données de démonstration (⚠ **vide** les collections, développement uniquement) :

```bash
npx tsx --env-file=.env.local scripts/seed.ts
```

Lancer : `npm run dev` puis ouvrir http://localhost:3000 et choisir un profil.

Scripts conseillés dans `package.json` :

```json
"seed": "tsx --env-file=.env.local scripts/seed.ts",
"test:api": "node scripts/api-test.mjs"
```

