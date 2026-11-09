// Analyse d'une photo jointe à une question du forum, avec l'API Gemini.
// Côté serveur uniquement : la clé GEMINI_API_KEY ne quitte jamais le serveur.

const DEFAULT_MODEL = "gemini-flash-latest";
const TIMEOUT_MS = 45_000;

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

const INSTRUCTIONS = `Tu es l'assistant IA du forum de santé « RDV Santé » (Tunisie).
Un patient a publié une question avec une photo. Ta réponse sera affichée en premier
dans la discussion ; des patients et des médecins pourront répondre ensuite.

Règles :
- Réponds en français, avec un ton bienveillant et simple, en 250 mots maximum, sans titre ni Markdown.
- Décris d'abord ce que tu observes sur la photo, puis réponds à la question en t'appuyant dessus.
- Tu ne poses pas de diagnostic et tu ne prescris aucun médicament ni dosage : donne des informations
  générales et des conseils prudents.
- Si la photo ne montre rien d'utile pour la question, ou n'est pas liée à la santé, dis-le simplement.
- Si la photo ou la question évoque une urgence (saignement important, brûlure étendue, difficulté à
  respirer, signes d'infection grave…), conseille d'appeler le SAMU (190) ou d'aller aux urgences.
- Termine par une phrase rappelant que cette réponse ne remplace pas l'avis d'un médecin et qu'il est
  possible de prendre rendez-vous sur RDV Santé.`;

function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Photo invalide.");
  return { mimeType: match[1], data: match[2] };
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
};

export async function analyzeQuestionPhoto(input: {
  title: string;
  content: string;
  photo: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiUnavailableError("L'analyse par l'IA n'est pas configurée (GEMINI_API_KEY).");
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const image = parseDataUrl(input.photo);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: `Titre de la question : ${input.title}\n\nQuestion du patient :\n${input.content}` },
              { inlineData: image },
            ],
          },
        ],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    },
  );

  const data = (await res.json().catch(() => ({}))) as GeminiResponse;
  if (!res.ok) {
    console.error("Gemini", res.status, data.error?.message);
    throw new AiUnavailableError("Le service d'IA n'a pas pu analyser la photo.");
  }
  if (data.promptFeedback?.blockReason)
    throw new AiUnavailableError("L'IA n'a pas pu analyser cette photo.");

  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new AiUnavailableError("L'IA n'a pas renvoyé de réponse.");
  return text;
}
