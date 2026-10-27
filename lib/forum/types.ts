import type { Role } from "../feedbacks/types";

export interface ForumQuestion {
  id: string;
  author_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  syncStatus: "synced" | "pending";
}

export interface ForumReply {
  id: string;
  question_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  syncStatus: "synced" | "pending";
}

/** Question affichée dans la liste, avec ses compteurs de réponses. */
export interface ForumQuestionSummary extends ForumQuestion {
  replyCount: number;
  lastReply?: ForumReply;
}

/** Utilisateur qui agit (vient de la session). */
export interface Actor {
  id: string;
  role: Role;
}

export interface QuestionInput {
  title: string;
  content: string;
}
