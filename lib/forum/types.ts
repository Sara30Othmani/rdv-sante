import type { Role } from "../feedbacks/types";

// Le nom et le rôle de l'auteur sont copiés dans chaque message (comme
// authorName / authorRole dans models/ForumPost.ts) : l'affichage ne dépend
// pas d'une liste d'utilisateurs et l'historique reste stable.

export interface ForumQuestion {
  id: string;
  author_id: string;
  author_name: string;
  author_role: Role;
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
  author_name: string;
  author_role: Role;
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

/** Utilisateur qui agit : même forme que la session (lib/session.ts). */
export interface Actor {
  id: string;
  name: string;
  role: Role;
}

export interface QuestionInput {
  title: string;
  content: string;
}
