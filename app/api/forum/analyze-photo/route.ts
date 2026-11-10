import { requireUser } from "@/lib/auth";
import { fail, json, serverError } from "@/lib/http";
import { analyzeQuestionPhoto, AiUnavailableError } from "@/lib/forum/ai";
import { cleanText, validateQuestion } from "@/lib/forum/rules";

/**
 * Analyse par l'IA de la photo jointe à une question du forum.
 * Le forum est stocké dans le navigateur : la route ne fait que l'analyse
 * et renvoie le texte, que le navigateur enregistre comme première réponse.
 */
export async function POST(req: Request) {
  const auth = await requireUser(req, ["PATIENT"]);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(400, "Requête invalide.");
  const { title, content, photo } = body as Record<string, unknown>;
  if (!photo) return fail(400, "Aucune photo à analyser.");
  const errors = validateQuestion({ title, content, photo } as never);
  if (errors.length) return fail(400, errors.join("\n"));

  try {
    const text = await analyzeQuestionPhoto({
      title: cleanText(title),
      content: cleanText(content),
      photo: photo as string,
    });
    return json({ text });
  } catch (e) {
    if (e instanceof AiUnavailableError) return fail(503, e.message);
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError"))
      return fail(504, "L'analyse a pris trop de temps. Réessayez.");
    return serverError(e);
  }
}
