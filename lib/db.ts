import { openDB, DBSchema } from "idb";

import { Feedback } from "./feedbacks/types";

import type { ForumQuestion, ForumReply } from "./forum/types";
 
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

export const DB_VERSION = 2;
 
// Chaque version ne fait que des ajouts : les données existantes sont conservées.

export const getDB = () =>

  openDB<RdvDB>(DB_NAME, DB_VERSION, {

    upgrade(db, oldVersion) {

      if (oldVersion < 1) {

        const s = db.createObjectStore("feedbacks", { keyPath: "id" });

        s.createIndex("by-user", "user_id");

        s.createIndex("by-doctor", "doctor_id");

        db.createObjectStore("deleted", { keyPath: "id" });

      }

      if (oldVersion < 2) {

        const q = db.createObjectStore("forumQuestions", { keyPath: "id" });

        q.createIndex("by-author", "author_id");

        const r = db.createObjectStore("forumReplies", { keyPath: "id" });

        r.createIndex("by-question", "question_id");

        r.createIndex("by-author", "author_id");

      }

    },

  });