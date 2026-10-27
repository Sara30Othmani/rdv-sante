import { openDB, type DBSchema } from "idb";
import type { Feedback } from "./feedbacks/types";

// IndexedDB = cache local + file d'attente hors-ligne des feedbacks.
// La source de vérité est MongoDB (voir lib/feedbacks/service.ts → syncPending).
interface RdvDB extends DBSchema {
  feedbacks: {
    key: string;
    value: Feedback;
    indexes: { "by-user": string; "by-doctor": string };
  };
  deleted: { key: string; value: { id: string } };
}

// Version 3 : le modèle Feedback contient désormais user_name / doctor_name et
// les ids viennent de MongoDB. On repart de stores propres.
export const getDB = () =>
  openDB<RdvDB>("rdv-sante", 3, {
    upgrade(db) {
      for (const name of Array.from(db.objectStoreNames)) {
        db.deleteObjectStore(name);
      }
      const feedbacks = db.createObjectStore("feedbacks", { keyPath: "id" });
      feedbacks.createIndex("by-user", "user_id");
      feedbacks.createIndex("by-doctor", "doctor_id");
      db.createObjectStore("deleted", { keyPath: "id" });
    },
  });
