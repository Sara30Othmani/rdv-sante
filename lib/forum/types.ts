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
  /** Photo jointe (data URL JPEG, réduite dans le navigateur). */
  photo?: string;
  /**
   * Analyse de la photo par l'IA : « pending » tant que la réponse de l'IA
   * n'est pas enregistrée (hors-ligne, erreur…), « done » ensuite.
   */
  ai_analysis?: "pending" | "failed" | "done";
  created_at: string;
  updated_at: string;
  syncStatus: "synced" | "pending";
}

/** Auteur d'une réponse : un utilisateur, ou l'assistant IA. */
export type ReplyAuthorRole = Role | "AI";

export interface ForumReply {
  id: string;
  question_id: string;
  author_id: string;
  author_name: string;
  author_role: ReplyAuthorRole;
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
  /** Data URL de la photo ; null ou absent = pas de photo. */
  photo?: string | null;
}
