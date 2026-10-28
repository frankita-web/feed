import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { scriptPatchSchema, type ScriptContext } from "@/lib/script-tool";

const SYSTEM = `Eres guionista de contenido para redes sociales del estudio Franca Mandiola, que maneja el Instagram de restaurantes en Ciudad de México.
Ayudas a armar guiones de reels y videos cortos: gancho fuerte en los primeros 3 segundos, tomas concretas que se puedan grabar en el restaurante, texto en pantalla corto, y un cierre claro.
Escribe en español, cercano y directo, con frases cortas. No uses inglés salvo que sea parte de la marca.
Cuando propongas o cambies el guion, usa la herramienta actualizarGuion para escribirlo directamente en el documento (solo con los campos que cambian; si cambias tomas, manda la lista completa). Después explica en 1–3 frases qué hiciste o pregunta lo que falte.
Si te faltan datos importantes (qué plato, quién sale, qué se quiere lograr), pregunta antes de inventar.`;

function contextText(c: ScriptContext) {
  return [
    `Proyecto: ${c.project.name}${c.project.instagram ? ` (@${c.project.instagram})` : ""}.`,
    c.project.pillars.length && `Categorías de contenido: ${c.project.pillars.join(", ")}.`,
    c.post &&
      `Publicación del calendario: "${c.post.title}" · ${c.post.format} · ${c.post.date ?? "sin fecha"}${
        c.post.pillar ? ` · categoría ${c.post.pillar}` : ""
      }${c.post.caption ? `\nCopy actual: ${c.post.caption}` : ""}`,
    c.drinks?.length &&
      `Drinks de la carta (★ = Diageo, deben etiquetar a Diageo): ${c.drinks
        .map((d) => (d.diageo ? `${d.name} ★` : d.name))
        .join(", ")}.`,
    `Guion actual (JSON):\n${JSON.stringify(c.script, null, 2)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const { messages, context }: { messages: UIMessage[]; context: ScriptContext } =
    await req.json();

  const result = streamText({
    model: "anthropic/claude-sonnet-5.5",
    system: `${SYSTEM}\n\n${contextText(context)}`,
    messages: await convertToModelMessages(messages),
    tools: {
      // Se ejecuta en el navegador: escribe en el guion que está abierto.
      actualizarGuion: {
        description: "Escribe o cambia partes del guion abierto.",
        inputSchema: scriptPatchSchema,
      },
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // Mensaje claro para el error más común: AI Gateway sin activar en la cuenta.
      onError: (error) =>
        String(error).includes("credit card")
          ? "SETUP: La IA todavía no está activada. Hay que agregar una tarjeta en Vercel → AI Gateway para desbloquear los créditos gratis."
          : "No pude responder. Intenta de nuevo en un momento.",
    }),
  });
}
