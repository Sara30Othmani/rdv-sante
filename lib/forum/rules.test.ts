import { describe, expect, it } from "vitest";
import {
  canAskQuestion, canDeleteQuestion, canDeleteReply, canEditQuestion, canEditReply, canReply,
  cleanText, LIMITS, validateQuestion, validateReply,
} from "./rules";
import type { Actor, ForumQuestion, ForumReply } from "./types";

const patient: Actor = { id: "p1", name: "Sarra Ben Ali", role: "PATIENT" };
const otherPatient: Actor = { id: "p2", name: "Ahmed Mansour", role: "PATIENT" };
const doctor: Actor = { id: "d1", name: "Dr. Amel Ben Salem", role: "DOCTOR" };
const otherDoctor: Actor = { id: "d2", name: "Dr. Yassine Trabelsi", role: "DOCTOR" };

const t = "2026-01-01T00:00:00.000Z";
const question: ForumQuestion = {
  id: "q1", author_id: "p1", author_name: "Sarra Ben Ali", author_role: "PATIENT", title: "Titre valide", content: "Contenu suffisamment long",
  created_at: t, updated_at: t, syncStatus: "synced",
};
const reply: ForumReply = {
  id: "r1", question_id: "q1", author_id: "d1", author_name: "Dr. Amel Ben Salem", author_role: "DOCTOR", content: "Une réponse",
  created_at: t, updated_at: t, syncStatus: "synced",
};

describe("validation", () => {
  it("accepte une question valide", () => {
    expect(validateQuestion({ title: "Bonne question", content: "Un contenu de plus de dix caractères" })).toEqual([]);
  });

  it("exige titre et contenu", () => {
    const errors = validateQuestion({ title: "  ", content: "" });
    expect(errors).toEqual(["Le titre est obligatoire.", "La question est obligatoire."]);
  });

  it("applique les longueurs minimales et maximales", () => {
    expect(validateQuestion({ title: "abc", content: "court" })).toHaveLength(2);
    expect(
      validateQuestion({ title: "x".repeat(LIMITS.titleMax + 1), content: "y".repeat(LIMITS.contentMax + 1) }),
    ).toHaveLength(2);
    expect(
      validateQuestion({ title: "x".repeat(LIMITS.titleMax), content: "y".repeat(LIMITS.contentMax) }),
    ).toEqual([]);
  });

  it("refuse une réponse vide ou trop longue", () => {
    expect(validateReply("   \n ")).toEqual(["La réponse ne peut pas être vide."]);
    expect(validateReply("z".repeat(LIMITS.replyMax + 1))).toHaveLength(1);
    expect(validateReply("Merci !")).toEqual([]);
    expect(validateReply(undefined)).toHaveLength(1);
  });

  it("nettoie les caractères de contrôle et les espaces", () => {
    expect(cleanText("  Bon\u0000jour\u0007\n à tous  ")).toBe("Bonjour\n à tous");
    expect(cleanText(42)).toBe("");
  });
});

describe("permissions", () => {
  it("seuls les patients posent des questions", () => {
    expect(canAskQuestion(patient)).toBe(true);
    expect(canAskQuestion(doctor)).toBe(false);
  });

  it("patients et médecins peuvent répondre", () => {
    for (const a of [patient, otherPatient, doctor]) expect(canReply(a)).toBe(true);
  });

  it("seul l'auteur modifie sa question", () => {
    expect(canEditQuestion(question, patient)).toBe(true);
    expect(canEditQuestion(question, otherPatient)).toBe(false);
    expect(canEditQuestion(question, doctor)).toBe(false);
  });

  it("l'auteur ou un médecin (modération) supprime une question", () => {
    expect(canDeleteQuestion(question, patient)).toBe(true);
    expect(canDeleteQuestion(question, doctor)).toBe(true);
    expect(canDeleteQuestion(question, otherPatient)).toBe(false);
  });

  it("mêmes règles pour les réponses", () => {
    expect(canEditReply(reply, doctor)).toBe(true);
    expect(canEditReply(reply, patient)).toBe(false);
    expect(canEditReply(reply, otherDoctor)).toBe(false);
    expect(canDeleteReply(reply, doctor)).toBe(true);
    expect(canDeleteReply(reply, otherDoctor)).toBe(true);
    expect(canDeleteReply(reply, patient)).toBe(false);
  });
});
