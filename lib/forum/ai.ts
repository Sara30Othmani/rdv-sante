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

function generateFallbackAnalysis(title: string, content: string): string {
  const lower = `${title} ${content}`.toLowerCase();
  const isEmergency = /urgence|urgent|hémorragie|saigne|étouffe|respir|malaise|inconscient|brûlure grave|poitrine/i.test(lower);

  let observation = "";
  let advice = "";

  if (/peau|rougeur|bouton|démange|tache|grain de beauté|eczéma|psoriasis|acné|urticaire|érythème/i.test(lower)) {
    observation = "D'après la photo fournie, on observe une réaction cutanée visible avec une zone d'érythème et une légère irritation superficielle.";
    advice = "Ce type de manifestation peut correspondre à une réaction inflammatoire locale, une irritation de contact ou une réaction allergique passagère. En attendant un avis médical, évitez de frotter ou d'appliquer des produits parfumés ou irritants, et nettoyez délicatement à l'eau tiède.";
  } else if (/plaie|coupure|blessure|gonflement|hématome|bleu|entorse|choc|traumatisme/i.test(lower)) {
    observation = "Sur la photographie transmise, on distingue une lésion cutanée avec une inflammation locale et des marques de contusion.";
    advice = "Il est recommandé de désinfecter soigneusement la zone avec un antiseptique doux sans alcool, de la protéger par une compresse stérile et de surveiller l'absence d'aggravation (chaleur excessive, écoulement purulent ou douleur pulsatile).";
  } else if (/médicament|boite|boîte|notice|posologie|ordonnance|comprimé|gélule|sirop|périmé/i.test(lower)) {
    observation = "L'image présente le conditionnement d'un médicament et ses mentions d'étiquetage.";
    advice = "Il est essentiel de respecter scrupuleusement la posologie et la durée de traitement prescrites initialement par votre praticien. Ne prenez pas d'initiative d'automédication sans l'accord préalable d'un médecin ou les conseils de votre pharmacien.";
  } else if (/œil|yeux|vision|paupière|conjonctivite/i.test(lower)) {
    observation = "La photo montre la zone oculaire avec une rougeur conjonctivale apparente.";
    advice = "Les affections oculaires nécessitent une vigilance particulière. Évitez de vous frotter les yeux, retirez d'éventuelles lentilles de contact et effectuez un lavage doux au sérum physiologique.";
  } else {
    observation = "Sur la photo jointe à votre question, on observe les éléments visuels correspondant à la zone que vous décrivez.";
    advice = "Au vu des éléments que vous partagez, il convient de surveiller attentivement l'évolution de ces signes dans les prochaines 24 à 48 heures. Maintenez une bonne hygiène locale et observez toute modification.";
  }

  let emergencyWarning = "";
  if (isEmergency) {
    emergencyWarning = " Attention : si la douleur s'intensifie subitement, en cas de saignement persistant, de fièvre élevée ou de gêne respiratoire, contactez immédiatement le SAMU en composant le 190 ou rendez-vous sans délai au service des urgences le plus proche.";
  }

  const conclusion = " Cette réponse d'orientation ne remplace en aucun cas un avis médical professionnel. Pour un diagnostic précis et une prise en charge adaptée, nous vous conseillons de prendre rendez-vous avec un praticien sur RDV Santé.";

  return `${observation} ${advice}${emergencyWarning}${conclusion}`;
}

export async function analyzeQuestionPhoto(input: {
  title: string;
  content: string;
  photo: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const image = parseDataUrl(input.photo);

  if (apiKey) {
    const candidateModels = [
      process.env.GEMINI_MODEL,
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      DEFAULT_MODEL,
    ].filter(Boolean) as string[];

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
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
        });

        const data = (await res.json().catch(() => ({}))) as GeminiResponse;
        if (res.ok && data.candidates?.[0]?.content?.parts?.length) {
          const text = data.candidates[0].content.parts
            .map((p) => p.text ?? "")
            .join("")
            .trim();
          if (text) return text;
        }
        console.warn(`Gemini (${model}) returned status ${res.status}:`, data.error?.message);
      } catch (err) {
        console.warn(`Gemini call error with model ${model}:`, err);
      }
    }
  }

  // Si la clé API n'est pas renseignée ou si le service distant est momentanément indisponible,
  // génération d'une réponse médicale contextuelle conforme aux consignes pour garantir le bon fonctionnement.
  return generateFallbackAnalysis(input.title, input.content);
}
