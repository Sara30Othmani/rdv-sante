import { openDB, type DBSchema } from "idb";
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

// Chaque étape ne s'exécute qu'une fois, selon la version déjà installée.
export const getDB = () =>
  openDB<RdvDB>(DB_NAME, DB_VERSION, {
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
  });
