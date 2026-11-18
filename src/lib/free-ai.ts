// Franca usa solo el crédito gratis de Vercel, que no incluye Claude: se prueba en orden
// hasta dar con un modelo disponible. El último no ve fotos.
export const FREE_MODELS = [
  { id: "google/gemini-2.5-flash-lite", vision: true },
  { id: "google/gemini-3.5-flash-lite", vision: true },
  { id: "openai/gpt-4.1-mini", vision: true },
  { id: "nvidia/nemotron-3.5-lightning-free", vision: false },
];

/** Corre `run` con el primer modelo gratis que responda. */
export async function withFreeModels<T>(run: (model: string, vision: boolean) => Promise<T>) {
  const errors: string[] = [];
  for (const { id, vision } of FREE_MODELS) {
    try {
      return { result: await run(id, vision), model: id };
    } catch (error) {
      console.error(id, error);
      errors.push(`${id}: ${String(error).slice(0, 200)}`);
    }
  }
  throw new Error(errors.join(" | "));
}

/** Regla de Franca para todas las cuentas: nunca hashtags. */
const NO_HASHTAGS = "Nunca uses hashtags (nada que empiece con #), en ningún cliente.";

/** El tono del cliente, si lo tiene, manda sobre las reglas generales de los copys. */
export const voiceRule = (voice?: string) =>
  voice?.trim()
    ? `Tono del cliente (síguelo al pie de la letra; manda sobre cualquier otra regla de estilo):\n${voice.trim()}\nSi hay copys de ejemplo, inspírate en su estilo pero no repitas ninguno tal cual.\n${NO_HASHTAGS}`
    : `Tono: cercano y con frases cortas; emojis con moderación.\n${NO_HASHTAGS}`;

/** Por si la IA igual pone alguno: se borran los hashtags del copy. */
export const withoutHashtags = (text: string) =>
  text
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "$1")
    .replace(/[ \t]+$/gm, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
