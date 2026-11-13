import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { voiceRule, withFreeModels, withoutHashtags } from "@/lib/free-ai";

export type CopysRequest = {
  project: { name: string; instagram: string; voice?: string };
  posts: {
    id: string;
    title: string;
    format: string;
    date: string | null;
    pillar: string | null;
    caption: string;
    /** Miniatura JPEG en base64, si hay foto. */
    image?: string;
  }[];
};

const schema = z.object({
  captions: z.array(z.object({ id: z.string(), caption: z.string() })),
});

export type CopysResult = z.infer<typeof schema>;

const SYSTEM = `Eres la community manager del estudio Franca Mandiola, que lleva el Instagram de restaurantes en Ciudad de México.
Reescribe el copy de cada publicación que te pasan, en español de México.
- Usa lo que se ve en la foto, el título y los datos del copy actual (horarios, direcciones, nombres): consérvalos si están, pero no inventes datos nuevos.
- Cada copy distinto a los demás; nada de frases de relleno.
Devuelve un copy por publicación, con su mismo id.`;

export async function POST(request: Request) {
  const body = (await request.json()) as CopysRequest;
  if (!body.posts?.length || body.posts.length > 12)
    return NextResponse.json({ error: "Envía entre 1 y 12 publicaciones." }, { status: 400 });

  const context = [
    `Cliente: ${body.project.name}${body.project.instagram ? ` (@${body.project.instagram})` : ""}.`,
    voiceRule(body.project.voice),
  ].join("\n\n");

  try {
    const { result, model } = await withFreeModels(async (model, vision) => {
      const { output } = await generateText({
        model,
        system: SYSTEM,
        output: Output.object({ schema }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: context },
              ...body.posts.flatMap((post) => [
                {
                  type: "text" as const,
                  text: [
                    `Publicación id=${post.id}`,
                    `título: ${post.title || "sin título"}`,
                    `formato: ${post.format}`,
                    post.date && `fecha: ${post.date}`,
                    post.pillar && `categoría: ${post.pillar}`,
                    `copy actual: ${post.caption || "(vacío)"}`,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                },
                ...(vision && post.image
                  ? [{ type: "file" as const, mediaType: "image/jpeg", data: post.image }]
                  : []),
              ]),
            ],
          },
        ],
      });
      const known = new Set(body.posts.map((p) => p.id));
      const captions = (output?.captions ?? [])
        .map((c) => ({ ...c, caption: withoutHashtags(c.caption) }))
        .filter((c) => known.has(c.id) && c.caption);
      if (!captions.length) throw new Error("Respuesta vacía");
      return captions;
    });
    return NextResponse.json({ captions: result, model });
  } catch (error) {
    return NextResponse.json(
      {
        error: "No pude rehacer los copys. Intenta de nuevo en un momento.",
        detail: String(error).slice(0, 900),
      },
      { status: 502 },
    );
  }
}
