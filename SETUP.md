# Mise en route (MongoDB)

## 1. Dépendances
```bash
npm i mongoose idb
npm i -D tsx
```
(`tailwindcss`, `@tailwindcss/postcss` et `postcss` doivent déjà être présents.)

Ajouter dans `package.json` → `"scripts"` :
```json
"seed": "tsx --env-file=.env.local scripts/seed.ts",
"test:api": "node scripts/api-test.mjs"
```

## 2. Base de données
1. Créer un cluster gratuit sur MongoDB Atlas (ou lancer MongoDB en local).
2. Copier `.env.example` en `.env.local` et renseigner `MONGODB_URI`.
3. Charger les données de démonstration : `npm run seed`
4. `npm run dev` puis ouvrir http://localhost:3000 et choisir un profil.

Test des routes API (55 vérifications : droits, règles métier, créneaux, avis) :
`npm run seed`, lancer l'application, puis `npm run test:api` (variable `BASE_URL` si le port n'est pas 3000).
⚠ Le seed vide les collections : ne l'utilisez que sur une base de développement.

## 3. Ce qui existe
| Module | État |
|---|---|
| Rendez-vous | API + pages (patient, médecin) |
| Feedbacks | API + pages, avec mode hors-ligne (IndexedDB ↔ MongoDB) |
| Forum, stock médecin, médicaments | Modèles Mongoose prêts (`models/`), routes et pages à écrire |

## 4. Brancher le vrai module d'authentification
Seuls deux fichiers sont concernés :
- `lib/auth.ts` : `getCurrentUser()` lit aujourd'hui l'en-tête `x-user-id` (falsifiable, donc
  désactivé tant que `ALLOW_DEMO_LOGIN` n'est pas `true`). La remplacer par la lecture de la session.
- `lib/session.ts` : session de démonstration côté navigateur.

Ensuite supprimer `app/api/users/`, `components/ProfilePicker.tsx`, `components/RoleSwitcher.tsx`
et `lib/useDemoUsers.ts`.

## 5. Notes
- Les règles métier des feedbacks (`lib/feedbacks/rules.ts`) sont appliquées côté serveur : c'est
  le serveur qui fait foi, l'interface ne fait que masquer les boutons.
- Les statuts sont stockés en codes (`PENDING`, `DONE`…) ; les libellés français sont dans `lib/appointments.ts`.
- Les transactions MongoDB (utiles pour le stock) exigent un replica set : inclus dans Atlas.
