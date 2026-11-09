import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { FREE_MODELS, voiceRule } from "@/lib/free-ai";
import { FORMATS } from "@/lib/types";

export type OrganizeRequest = {
  project: {
    voice?: string;
    name: string;
    instagram: string;
    pillars: string[];
    monthlyGoal: number;
  };
  /** Primer día disponible (AAAA-MM-DD). */
  start: string;
  /** Días que ya tienen un post nuevo. */
  taken: string[];
  items: {
    id: string;
    name: string;
    image: string;
    video: boolean;
    brightness: number;
  }[];
};

const planSchema = z.object({
  posts: z.array(
    z.object({
      id: z.string().describe("id de la foto, tal cual"),
      date: z.string().describe("AAAA-MM-DD"),
      time: z.string().describe("HH:MM, hora sugerida de publicación"),
      title: z.string().describe("título corto interno, 2 a 5 palabras"),
      caption: z.string().describe("copy listo para Instagram"),
      pillar: z.string().nullable().describe("una de las categorías, o null"),
      format: z.enum(FORMATS),
      kind: z
        .enum(["drink", "plato", "ambiente", "personas", "otro"])
        .describe("qué muestra la foto; drink = cualquier trago o bebida"),
      light: z.enum(["dia", "noche"]).describe("si la foto se siente de día o de noche"),
    }),
  ),
});

export type OrganizePlan = z.infer<typeof planSchema>;

const SYSTEM = `Eres la community manager del estudio Franca Mandiola, que lleva el Instagram de restaurantes en Ciudad de México.
Te pasan fotos que todavía no se publican. Arma con ellas el calendario del feed:
- Elige la fecha de cada foto desde el primer día disponible, sin repetir días ocupados, con un ritmo parecido a la meta mensual (no todo seguido).
- Ordénalas para que el grid se vea bien. Reglas fijas: nunca dos drinks seguidos y alterna una foto de noche con una de día. Además, alterna platos con ambiente/personas y primeros planos con planos abiertos; nunca dos casi iguales seguidas.
- Marca cada foto con su tipo (drink, plato, ambiente, personas u otro) y si es de día o de noche.
- Escribe un copy por foto en español de México, con el tono del cliente, sin inventar datos (precios, ingredientes, nombres o fechas que no se vean o no te digan).
- Usa solo las categorías que te dan. El formato: "Foto" para fotos y "Reel vertical" para videos, salvo que otro calce claramente.
Devuelve todas las fotos, cada una una sola vez.`;

export async function POST(request: Request) {
  const body = (await request.json()) as OrganizeRequest;
  if (!body.items?.length || body.items.length > 20)
    return NextResponse.json(
      { error: "Elige entre 1 y 20 fotos." },
      { status: 400 },
    );

  const context = [
    `Cliente: ${body.project.name}${body.project.instagram ? ` (@${body.project.instagram})` : ""}.`,
    `Meta: ${body.project.monthlyGoal} posts al mes.`,
    body.project.pillars.length
      ? `Categorías: ${body.project.pillars.join(", ")}.`
      : "Sin categorías.",
    `Primer día disponible: ${body.start}.`,
    body.taken.length
      ? `Días ya ocupados: ${body.taken.join(", ")}.`
      : "No hay días ocupados.",
    voiceRule(body.project.voice),
  ].join("\n");

  const errors: string[] = [];
  for (const { id: model, vision } of FREE_MODELS) {
    try {
      const { output } = await generateText({
        model,
        system: SYSTEM,
        output: Output.object({ schema: planSchema }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: context },
              ...body.items.flatMap((item) => [
                {
                  type: "text" as const,
                  text: `Foto id=${item.id} · archivo "${item.name}" · ${item.video ? "video" : "foto"} · luminosidad ${item.brightness}/100`,
                },
                ...(vision
                  ? [{ type: "file" as const, mediaType: "image/jpeg", data: item.image }]
                  : []),
              ]),
            ],
          },
        ],
      });
      const known = new Set(body.items.map((i) => i.id));
      const posts = (output?.posts ?? []).filter((p) => known.has(p.id));
      if (!posts.length) throw new Error("Respuesta vacía");
      return NextResponse.json({ posts, model });
    } catch (error) {
      console.error(model, error);
      errors.push(`${model}: ${String(error).slice(0, 200)}`);
    }
  }
  {
    const error = errors.join(" | ");
    const setup = /credit card|Free tier/.test(error);
    return NextResponse.json(
      {
        error: setup
          ? "La IA todavía no está activada en Vercel (AI Gateway)."
          : "No pude organizar las fotos. Intenta de nuevo en un momento.",
        // Motivo técnico, para poder revisar qué falló (la página ya está protegida con clave).
        detail: error.slice(0, 900),
      },
      { status: 502 },
    );
  }
}
