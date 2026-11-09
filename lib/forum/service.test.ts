import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import { getDB, DB_NAME, DB_VERSION, DBBlockedError } from "../db";
import {
  createQuestion, createReply, deleteQuestion, deleteReply, ForumError, getQuestion,
  listQuestions, listReplies, markAiAnalysisFailed, saveAiReply, updateQuestion, updateReply,
} from "./service";
import type { Actor } from "./types";

const sara: Actor = { id: "p1", name: "Sarra Ben Ali", role: "PATIENT" };
const mohamed: Actor = { id: "p2", name: "Ahmed Mansour", role: "PATIENT" };
const doctor: Actor = { id: "d1", name: "Dr. Amel Ben Salem", role: "DOCTOR" };
const otherDoctor: Actor = { id: "d2", name: "Dr. Yassine Trabelsi", role: "DOCTOR" };

const valid = { title: "Préparer un rendez-vous", content: "Quels documents faut-il apporter ?" };

async function expectForumError(p: Promise<unknown>, code: ForumError["code"]) {
  const err = await p.then(() => null, (e) => e);
  expect(err).toBeInstanceOf(ForumError);
  expect((err as ForumError).code).toBe(code);
}

beforeEach(() => {
  // Base IndexedDB neuve pour chaque test
  globalThis.indexedDB = new IDBFactory();
});

describe("questions", () => {
  it("crée une question liée à l'auteur connecté", async () => {
    const q = await createQuestion(sara, { ...valid, title: `  ${valid.title}  ` });
    expect(q.author_id).toBe("p1");
    expect(q.author_name).toBe("Sarra Ben Ali");
    expect(q.author_role).toBe("PATIENT");
    expect(q.title).toBe(valid.title);
    expect(q.syncStatus).toBe("pending");
    expect(await getQuestion(q.id)).toEqual(q);
  });

  it("ignore un author_id ou un id fourni dans les données", async () => {
    const forged = { ...valid, author_id: "p2", id: "forced-id" } as typeof valid;
    const q = await createQuestion(sara, forged);
    expect(q.author_id).toBe("p1");
    expect(q.id).not.toBe("forced-id");
  });

  it("refuse une question invalide sans rien enregistrer", async () => {
    await expectForumError(createQuestion(sara, { title: "", content: "court" }), "VALIDATION");
    expect(await listQuestions()).toHaveLength(0);
  });

  it("refuse les médecins et les visiteurs non connectés", async () => {
    await expectForumError(createQuestion(doctor, valid), "FORBIDDEN");
    await expectForumError(createQuestion(null, valid), "UNAUTHENTICATED");
  });

  it("l'auteur modifie titre et contenu, sans toucher à l'auteur ni à la date de création", async () => {
    const q = await createQuestion(sara, valid);
    const updated = await updateQuestion(sara, q.id, {
      title: "Titre modifié",
      content: "Contenu modifié et assez long",
      author_id: "p2",
      created_at: "2000-01-01",
    } as typeof valid);
    expect(updated.title).toBe("Titre modifié");
    expect(updated.author_id).toBe("p1");
    expect(updated.created_at).toBe(q.created_at);
    expect((await getQuestion(q.id))?.title).toBe("Titre modifié");
  });

  it("un autre utilisateur, même médecin, ne peut pas modifier la question", async () => {
    const q = await createQuestion(sara, valid);
    await expectForumError(updateQuestion(mohamed, q.id, valid), "FORBIDDEN");
    await expectForumError(updateQuestion(doctor, q.id, valid), "FORBIDDEN");
    await expectForumError(updateQuestion(sara, "inconnue", valid), "NOT_FOUND");
    await expectForumError(updateQuestion(sara, q.id, { title: "x", content: "" }), "VALIDATION");
  });

  it("liste les questions avec le nombre de réponses et la dernière réponse", async () => {
    const q1 = await createQuestion(sara, valid);
    await createQuestion(mohamed, { ...valid, title: "Une autre question" });
    await createReply(doctor, q1.id, "Première réponse");
    await new Promise((r) => setTimeout(r, 5)); // horodatages distincts
    const last = await createReply(mohamed, q1.id, "Deuxième réponse");
    const list = await listQuestions();
    const summary = list.find((q) => q.id === q1.id)!;
    expect(list).toHaveLength(2);
    expect(summary.replyCount).toBe(2);
    expect(summary.lastReply?.id).toBe(last.id);
    expect(list.find((q) => q.id !== q1.id)!.replyCount).toBe(0);
  });
});

describe("suppression d'une question", () => {
  it("supprime la question et ses réponses (pas d'orphelines)", async () => {
    const q = await createQuestion(sara, valid);
    const other = await createQuestion(mohamed, { ...valid, title: "Autre question" });
    await createReply(doctor, q.id, "Réponse 1");
    await createReply(mohamed, q.id, "Réponse 2");
    const kept = await createReply(sara, other.id, "Réponse ailleurs");

    await deleteQuestion(sara, q.id);

    expect(await getQuestion(q.id)).toBeUndefined();
    expect(await listReplies(q.id)).toHaveLength(0);
    const db = await getDB();
    const all = await db.getAll("forumReplies");
    expect(all.map((r) => r.id)).toEqual([kept.id]);
    // Aucune réponse ne pointe vers une question inexistante
    const questionIds = new Set((await db.getAll("forumQuestions")).map((x) => x.id));
    expect(all.every((r) => questionIds.has(r.question_id))).toBe(true);
  });

  it("un médecin peut supprimer (modération), pas un autre patient", async () => {
    const q = await createQuestion(sara, valid);
    await expectForumError(deleteQuestion(mohamed, q.id), "FORBIDDEN");
    expect(await getQuestion(q.id)).toBeDefined();
    await deleteQuestion(doctor, q.id);
    expect(await getQuestion(q.id)).toBeUndefined();
    await expectForumError(deleteQuestion(doctor, q.id), "NOT_FOUND");
  });
});

describe("réponses", () => {
  it("crée une réponse liée à la question et à l'auteur connecté", async () => {
    const q = await createQuestion(sara, valid);
    const r = await createReply(doctor, q.id, "  Apportez vos ordonnances.  ");
    expect(r).toMatchObject({
      question_id: q.id, author_id: "d1", author_name: "Dr. Amel Ben Salem", author_role: "DOCTOR",
      content: "Apportez vos ordonnances.",
    });
    expect(await listReplies(q.id)).toEqual([r]);
  });

  it("refuse une réponse vide ou sur une question inexistante", async () => {
    const q = await createQuestion(sara, valid);
    await expectForumError(createReply(mohamed, q.id, "   "), "VALIDATION");
    await expectForumError(createReply(mohamed, "inconnue", "Bonjour"), "NOT_FOUND");
    await expectForumError(createReply(undefined, q.id, "Bonjour"), "UNAUTHENTICATED");
    expect(await listReplies(q.id)).toHaveLength(0);
  });

  it("retourne les réponses dans l'ordre chronologique", async () => {
    const q = await createQuestion(sara, valid);
    const a = await createReply(doctor, q.id, "A");
    await new Promise((r) => setTimeout(r, 5));
    const b = await createReply(mohamed, q.id, "B");
    expect((await listReplies(q.id)).map((r) => r.id)).toEqual([a.id, b.id]);
  });

  it("seul l'auteur modifie sa réponse", async () => {
    const q = await createQuestion(sara, valid);
    const r = await createReply(doctor, q.id, "Texte initial");
    await expectForumError(updateReply(sara, r.id, "Piratage"), "FORBIDDEN");
    await expectForumError(updateReply(otherDoctor, r.id, "Piratage"), "FORBIDDEN");
    await expectForumError(updateReply(doctor, r.id, ""), "VALIDATION");
    const updated = await updateReply(doctor, r.id, "Texte corrigé");
    expect(updated.content).toBe("Texte corrigé");
    expect(updated.question_id).toBe(q.id);
    expect((await listReplies(q.id))[0].content).toBe("Texte corrigé");
  });

  it("l'auteur ou un médecin (modération) supprime une réponse", async () => {
    const q = await createQuestion(sara, valid);
    const r1 = await createReply(doctor, q.id, "Réponse du médecin");
    const r2 = await createReply(mohamed, q.id, "Réponse de Mohamed");
    await expectForumError(deleteReply(sara, r1.id), "FORBIDDEN");
    await deleteReply(doctor, r1.id);
    await deleteReply(otherDoctor, r2.id);
    expect(await listReplies(q.id)).toHaveLength(0);
    expect(await getQuestion(q.id)).toBeDefined();
    await expectForumError(deleteReply(doctor, r2.id), "NOT_FOUND");
  });
});

describe("photo et réponse de l'IA", () => {
  const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  const photo2 = "data:image/jpeg;base64,/9j/4AAQSkZJRh==";

  it("une question avec photo attend l'analyse de l'IA", async () => {
    const q = await createQuestion(sara, { ...valid, photo });
    expect(q.photo).toBe(photo);
    expect(q.ai_analysis).toBe("pending");
    const plain = await createQuestion(sara, valid);
    expect(plain.photo).toBeUndefined();
    expect(plain.ai_analysis).toBeUndefined();
  });

  it("refuse un fichier qui n'est pas une image", async () => {
    await expectForumError(
      createQuestion(sara, { ...valid, photo: "data:text/html;base64,PGgxPg==" }),
      "VALIDATION",
    );
  });

  it("la réponse de l'IA reste la première, même après d'autres réponses", async () => {
    const q = await createQuestion(sara, { ...valid, photo });
    await createReply(doctor, q.id, "Réponse du médecin");
    await new Promise((r) => setTimeout(r, 5)); // dates distinctes
    await createReply(mohamed, q.id, "Réponse d'un patient");
    const ai = await saveAiReply(sara, q.id, "Analyse de la photo");
    expect(ai.author_role).toBe("AI");
    const replies = await listReplies(q.id);
    expect(replies.map((r) => r.content)).toEqual([
      "Analyse de la photo", "Réponse du médecin", "Réponse d'un patient",
    ]);
    expect((await getQuestion(q.id))?.ai_analysis).toBe("done");
  });

  it("seul l'auteur de la question enregistre l'analyse ; personne ne la modifie", async () => {
    const q = await createQuestion(sara, { ...valid, photo });
    await expectForumError(saveAiReply(mohamed, q.id, "x"), "FORBIDDEN");
    await expectForumError(markAiAnalysisFailed(doctor, q.id), "FORBIDDEN");
    const ai = await saveAiReply(sara, q.id, "Analyse");
    await expectForumError(updateReply(sara, ai.id, "modifiée"), "FORBIDDEN");
    // Un médecin peut la retirer (modération)
    await deleteReply(doctor, ai.id);
    expect(await listReplies(q.id)).toHaveLength(0);
  });

  it("refuse l'analyse d'une question sans photo", async () => {
    const q = await createQuestion(sara, valid);
    await expectForumError(saveAiReply(sara, q.id, "Analyse"), "FORBIDDEN");
  });

  it("une nouvelle photo remplace l'analyse ; sans photo, l'analyse disparaît", async () => {
    const q = await createQuestion(sara, { ...valid, photo });
    await saveAiReply(sara, q.id, "Analyse 1");
    await createReply(doctor, q.id, "Réponse du médecin");

    // Titre modifié, photo inchangée : l'analyse reste
    await updateQuestion(sara, q.id, { ...valid, title: "Nouveau titre ici", photo });
    expect((await listReplies(q.id))[0].content).toBe("Analyse 1");

    const changed = await updateQuestion(sara, q.id, { ...valid, photo: photo2 });
    expect(changed.ai_analysis).toBe("pending");
    expect((await listReplies(q.id)).map((r) => r.content)).toEqual(["Réponse du médecin"]);

    await saveAiReply(sara, q.id, "Analyse 2");
    const removed = await updateQuestion(sara, q.id, { ...valid, photo: null });
    expect(removed.photo).toBeUndefined();
    expect(removed.ai_analysis).toBeUndefined();
    expect((await listReplies(q.id)).map((r) => r.content)).toEqual(["Réponse du médecin"]);
  });

  it("une analyse échouée peut être relancée", async () => {
    const q = await createQuestion(sara, { ...valid, photo });
    expect((await markAiAnalysisFailed(sara, q.id)).ai_analysis).toBe("failed");
    await saveAiReply(sara, q.id, "Analyse");
    expect((await getQuestion(q.id))?.ai_analysis).toBe("done");
  });
});

describe("migration de la base", () => {
  it("passe de la v3 (main) à la v4 sans perdre les feedbacks", async () => {
    const v3 = await openDB(DB_NAME, 3, {
      upgrade(db) {
        db.createObjectStore("feedbacks", { keyPath: "id" });
        db.createObjectStore("deleted", { keyPath: "id" });
      },
    });
    await v3.put("feedbacks", { id: "fb1", content: "Feedback en cache" });
    v3.close();

    const db = await getDB();
    expect(db.version).toBe(DB_VERSION);
    expect(await db.get("feedbacks", "fb1")).toMatchObject({ content: "Feedback en cache" });
    expect([...db.objectStoreNames]).toEqual(
      expect.arrayContaining(["feedbacks", "deleted", "forumQuestions", "forumReplies"]),
    );
  });

  it("signale un ancien onglet qui bloque la mise à jour au lieu d'attendre indéfiniment", async () => {
    const oldTab = await openDB(DB_NAME, 3, {
      upgrade(db) {
        db.createObjectStore("feedbacks", { keyPath: "id" });
      },
    }); // connexion laissée ouverte, comme un onglet resté sur l'ancienne version

    const err = await getDB().then(() => null, (e) => e);
    expect(err).toBeInstanceOf(DBBlockedError);

    oldTab.close();
    const db = await getDB(); // l'appel suivant réessaie et réussit
    expect(db.version).toBe(DB_VERSION);
  });

  it("réutilise la même connexion", async () => {
    expect(await getDB()).toBe(await getDB());
  });

  it("depuis une ancienne version (avant la v3), repart de stores propres", async () => {
    const v2 = await openDB(DB_NAME, 2, {
      upgrade(db) {
        db.createObjectStore("feedbacks", { keyPath: "id" });
        db.createObjectStore("forumQuestions", { keyPath: "id" });
      },
    });
    await v2.put("forumQuestions", { id: "old", title: "Ancien format" });
    v2.close();

    const db = await getDB();
    expect(await db.get("forumQuestions", "old")).toBeUndefined();
    expect([...db.objectStoreNames]).toEqual(
      expect.arrayContaining(["feedbacks", "deleted", "forumQuestions", "forumReplies"]),
    );
  });
});
