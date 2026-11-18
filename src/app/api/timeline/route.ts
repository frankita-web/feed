import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withFreeModels } from "@/lib/free-ai";

export type TimelineRequest = {
  project: string;
  shoot: string;
  /** HH:MM de llegada del equipo. */
  start: string;
  /** HH:MM en que se termina, si se sabe. */
  end?: string;
  /** Ideas del shoot (lo que hay que fotografiar o grabar). */
  ideas: { title: string; notes: string }[];
  /** Lo que ya está escrito en el timeline, para respetarlo si sirve. */
  current?: string;
};

const schema = z.object({
  blocks: z.array(
    z.object({
      time: z.string().describe("hora de inicio, HH:MM en 24 h"),
      minutes: z.number().describe("cuánto dura el bloque, en minutos"),
      activity: z.string().describe("qué se hace, corto (ej. 'Contenido 1 — entradas + drinks')"),
      notes: z.string().describe("formato o indicación corta (ej. 'video horizontal o foto'); vacío si no aplica"),
      products: z.array(z.string()).describe("platos, drinks o tomas de ese bloque, uno por línea"),
    }),
  ),
});

export type TimelineResult = z.infer<typeof schema>;

const SYSTEM = `Eres productora de shoots de foto y video para restaurantes (estudio Franca Mandiola, Ciudad de México).
Arma el timeline del día del shoot, en español de México, como una agenda profesional de producción publicitaria:
- Primer bloque: llegada del equipo y setup de cámara y luces (unos 30 min).
- Agrupa las ideas en bloques lógicos (entradas + drinks, platos fuertes, postres, ambiente, personas…), con el producto de cada uno.
- Deja tiempos realistas (30 a 80 min por bloque) y un bloque de cierre para revisar y respaldar el material.
- Las horas van seguidas: cada bloque empieza cuando termina el anterior.
- No inventes platos: usa solo lo que dicen las ideas; si no hay detalle, deja la lista de productos corta.`;

export async function POST(request: Request) {
  const body = (await request.json()) as TimelineRequest;
  if (!body.ideas?.length && !body.current)
    return NextResponse.json(
      { error: "Agrega ideas a este shoot (arrástralas a su columna) para armar el timeline." },
      { status: 400 },
    );
  const prompt = [
    `Cliente: ${body.project}. Shoot: ${body.shoot || "sin nombre"}.`,
    `Llegada del equipo: ${body.start}.${body.end ? ` Hay que terminar a las ${body.end}.` : ""}`,
    body.ideas.length &&
      `Ideas del shoot:\n${body.ideas.map((i) => `- ${i.title}${i.notes ? `: ${i.notes}` : ""}`).join("\n")}`,
    body.current && `Timeline que ya existe (mejóralo, respeta lo que tenga sentido):\n${body.current}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { result } = await withFreeModels(async (model) => {
      const { output } = await generateText({
        model,
        system: SYSTEM,
        output: Output.object({ schema }),
        prompt,
      });
      if (!output?.blocks?.length) throw new Error("Respuesta vacía");
      return output;
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "No pude armar el timeline. Intenta de nuevo en un momento.", detail: String(error).slice(0, 900) },
      { status: 502 },
    );
  }
}
