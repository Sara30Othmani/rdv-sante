"use client";

import { apiJson } from "../api";
import type { Actor, ForumQuestion, ForumReply } from "./types";
import { LIMITS, PHOTO_TYPES } from "./rules";
import { markAiAnalysisFailed, saveAiReply } from "./service";

// Photo d'une question : réduite dans le navigateur avant d'être stockée
// (IndexedDB) et envoyée à l'IA, pour rester légère.

const MAX_SIDE = 1280;
const QUALITY = 0.82;

/** Vérifie le fichier choisi ; renvoie un message d'erreur ou null. */
export function checkPhotoFile(file: File): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type))
    return "Choisissez une image JPEG, PNG ou WebP.";
  if (file.size > LIMITS.photoFileMaxBytes) return "L'image ne doit pas dépasser 10 Mo.";
  return null;
}

/** Réduit l'image (côté le plus long : 1280 px) et la convertit en JPEG (data URL). */
export async function compressPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Cette image n'a pas pu être lue.");
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cette image n'a pas pu être lue.");
  // Fond blanc : les zones transparentes (PNG) ne deviennent pas noires en JPEG.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  if (dataUrl.length > LIMITS.photoMaxChars) throw new Error("L'image est trop volumineuse.");
  return dataUrl;
}

/**
 * Demande l'analyse de la photo au serveur puis enregistre la réponse de
 * l'IA comme première réponse. En cas d'échec, la question est marquée
 * « failed » (sauf hors-ligne : elle reste « pending ») et l'erreur est relancée.
 */
export async function runAiAnalysis(actor: Actor, question: ForumQuestion): Promise<ForumReply> {
  try {
    const { text } = await apiJson<{ text: string }>("/api/forum/analyze-photo", {
      method: "POST",
      body: JSON.stringify({ title: question.title, content: question.content, photo: question.photo }),
    });
    return await saveAiReply(actor, question.id, text);
  } catch (err) {
    // Hors-ligne (fetch impossible) : l'analyse reste « pending » et sera
    // relancée à la prochaine ouverture de la discussion.
    const offline = err instanceof TypeError || (typeof navigator !== "undefined" && !navigator.onLine);
    if (offline) throw new Error("Vous êtes hors ligne : la photo sera analysée dès le retour de la connexion.");
    await markAiAnalysisFailed(actor, question.id).catch(() => {});
    throw err;
  }
}
