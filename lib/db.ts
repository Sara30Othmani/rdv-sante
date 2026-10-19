import { openDB, DBSchema } from "idb";

import { Feedback } from "./feedbacks/types";
 
interface RdvDB extends DBSchema {

  feedbacks: {

    key: string;

    value: Feedback;

    indexes: { "by-user": string; "by-doctor": string };

  };

  deleted: { key: string; value: { id: string } };

}
 
export const getDB = () =>

  openDB<RdvDB>("rdv-sante", 1, {

    upgrade(db) {

      const s = db.createObjectStore("feedbacks", { keyPath: "id" });

      s.createIndex("by-user", "user_id");

      s.createIndex("by-doctor", "doctor_id");

      db.createObjectStore("deleted", { keyPath: "id" });

    },

  });