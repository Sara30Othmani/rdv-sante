import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Feedback } from "./feedbacks/types";
import type { ForumQuestion, ForumReply } from "./forum/types";

// IndexedDB = cache local + file d'attente hors-ligne des feedbacks.
// La source de vérité est MongoDB (voir lib/feedbacks/service.ts → syncPending).
// Le forum y est aussi stocké, en attendant ses routes API (models/ForumPost…).
interface RdvDB extends DBSchema {
  feedbacks: {
    key: string;
    value: Feedback;
    indexes: { "by-user": string; "by-doctor": string };
  };
  deleted: { key: string; value: { id: string } };
  forumQuestions: {
    key: string;
    value: ForumQuestion;
    indexes: { "by-author": string };
  };
  forumReplies: {
    key: string;
    value: ForumReply;
    indexes: { "by-question": string; "by-author": string };
  };
}

export const DB_NAME = "rdv-sante";
export const DB_VERSION = 4;

export class DBBlockedError extends Error {
  constructor() {
    super(
      "La base locale doit être mise à jour, mais un autre onglet de RDV Santé l'utilise encore. " +
        "Fermez les autres onglets de l'application puis rechargez la page."
    );
    this.name = "DBBlockedError";
  }
}

function open(): Promise<IDBPDatabase<RdvDB>> {
  return new Promise((resolve, reject) => {
    openDB<RdvDB>(DB_NAME, DB_VERSION, {
      // Chaque étape ne s'exécute qu'une fois, selon la version déjà installée.
      upgrade(db, oldVersion) {
        // Version 3 : le modèle Feedback contient désormais user_name / doctor_name et
        // les ids viennent de MongoDB. On repart de stores propres.
        if (oldVersion < 3) {
          for (const name of Array.from(db.objectStoreNames)) {
            db.deleteObjectStore(name);
          }
          const feedbacks = db.createObjectStore("feedbacks", { keyPath: "id" });
          feedbacks.createIndex("by-user", "user_id");
          feedbacks.createIndex("by-doctor", "doctor_id");
          db.createObjectStore("deleted", { keyPath: "id" });
        }
        // Version 4 : forum (questions et réponses). Les feedbacks sont conservés.
        if (oldVersion < 4) {
          const questions = db.createObjectStore("forumQuestions", { keyPath: "id" });
          questions.createIndex("by-author", "author_id");
          const replies = db.createObjectStore("forumReplies", { keyPath: "id" });
          replies.createIndex("by-question", "question_id");
          replies.createIndex("by-author", "author_id");
        }
      },
      // Un ancien onglet garde la base ouverte : sans cela, l'ouverture attendrait
      // indéfiniment (bouton bloqué sur « Enregistrement… »).
      blocked() {
        reject(new DBBlockedError());
      },
      // Un autre onglet a besoin de mettre à jour la base : on libère la connexion.
      blocking() {
        forget();
      },
      terminated() {
        cache = null;
      },
    }).then(resolve, reject);
  });
}

// Une seule connexion partagée (au lieu d'une nouvelle à chaque appel),
// rouverte si le navigateur la ferme ou si l'IndexedDB change (tests).
let cache: { factory: IDBFactory; db: Promise<IDBPDatabase<RdvDB>> } | null = null;

function forget() {
  const current = cache;
  cache = null;
  current?.db.then((db) => db.close()).catch(() => {});
}

export function getDB(): Promise<IDBPDatabase<RdvDB>> {
  if (!cache || cache.factory !== globalThis.indexedDB) {
    const db = open();
    const entry = { factory: globalThis.indexedDB, db };
    cache = entry;
    db.catch(() => {
      if (cache === entry) cache = null; // réessayer au prochain appel
    });
  }
  return cache.db;
}
