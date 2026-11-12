import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withFreeModels } from "@/lib/free-ai";
import type { MonthInsights } from "@/lib/types";

export type InsightsRequest = {
  project: { name: string; instagram: string };
  /** Mes del reporte, como "noviembre 2026". */
  month: string;
  /** Capturas en JPEG base64. */
  images: string[];
  /** Lo que ya se había leído este mes (para sumar capturas nuevas sin perderlo). */
  previous?: Partial<MonthInsights>;
  /** Números del mes anterior, para comparar. */
  lastMonth?: Partial<MonthInsights>;
  /** Lo que salió en el calendario este mes. */
  calendar: string;
};

const num = (what: string) => z.number().nullable().describe(`${what}; null si no aparece en las capturas`);

const schema = z.object({
  followers: num("seguidores totales"),
  followersGained: num("seguidores nuevos (o variación neta) del periodo"),
  reach: num("cuentas alcanzadas"),
  views: num("visualizaciones / impresiones"),
  interactions: num("interacciones totales (cuentas que interactuaron o interacciones de contenido)"),
  likes: num("me gusta"),
  comments: num("comentarios"),
  saves: num("guardados"),
  shares: num("veces compartido"),
  profileVisits: num("visitas al perfil"),
  linkClicks: num("toques en enlaces / clics al sitio web"),
  topPosts: z
    .array(z.object({ description: z.string(), result: z.string() }))
    .describe("hasta 3 publicaciones que mejor funcionaron, si las capturas lo muestran: qué eran y su número"),
  summary: z.string().describe("2 o 3 frases simples sobre cómo le fue a la cuenta este mes"),
  tips: z.array(z.string()).describe("2 a 4 ideas concretas para el próximo mes"),
});

export type InsightsResult = z.infer<typeof schema>;

const SYSTEM = `Eres la analista del estudio Franca Mandiola, que lleva el Instagram de restaurantes en Ciudad de México.
Te pasan capturas de pantalla de las estadísticas de Instagram de una cuenta.
- Lee los números tal cual aparecen. Convierte abreviaturas: "1,2 mil" o "1.2K" = 1200, "3 M" = 3000000.
- Si un número no aparece en ninguna captura, déjalo en null. Nunca inventes.
- Si te pasan lo que ya se había leído, consérvalo y solo cambia lo que las capturas nuevas muestren.
- El resumen y las ideas, en español de México, simples y sin palabras técnicas (Franca no es técnica). Nada de hashtags.`;

export async function POST(request: Request) {
  const body = (await request.json()) as InsightsRequest;
  if (!body.images?.length || body.images.length > 10)
    return NextResponse.json({ error: "Sube entre 1 y 10 capturas." }, { status: 400 });

  const context = [
    `Cuenta: ${body.project.name}${body.project.instagram ? ` (@${body.project.instagram})` : ""}.`,
    `Mes del reporte: ${body.month}.`,
    `Calendario del mes: ${body.calendar}`,
    body.previous && `Ya leído antes este mes: ${JSON.stringify(body.previous)}`,
    body.lastMonth && `Mes anterior (para comparar en el resumen): ${JSON.stringify(body.lastMonth)}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { result } = await withFreeModels(async (model, vision) => {
      if (!vision) throw new Error("Este modelo no ve imágenes");
      const { output } = await generateText({
        model,
        system: SYSTEM,
        output: Output.object({ schema }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: context },
              ...body.images.map((data) => ({ type: "file" as const, mediaType: "image/jpeg", data })),
            ],
          },
        ],
      });
      if (!output) throw new Error("Respuesta vacía");
      return output;
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "No pude leer las capturas. Intenta de nuevo en un momento.",
        detail: String(error).slice(0, 900),
      },
      { status: 502 },
    );
  }
}
