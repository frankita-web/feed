import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withFreeModels } from "@/lib/free-ai";

export type ClassifyRequest = {
  posts: { id: string; title: string; caption: string; image?: string; brightness?: number }[];
};

const schema = z.object({
  tags: z.array(
    z.object({
      id: z.string(),
      kind: z
        .enum(["drink", "plato", "ambiente", "personas", "arte", "otro"])
        .describe(
          "qué muestra la foto; drink = cualquier trago o bebida; arte = pintura, ilustración, collage o texto escrito (moodboard), no comida ni el lugar",
        ),
      light: z.enum(["dia", "noche"]).describe("si la foto se siente de día o de noche"),
    }),
  ),
});

export type ClassifyResult = z.infer<typeof schema>;

/** Marca cada post con su tipo y si se siente de día o de noche, para ordenar el feed. */
export async function POST(request: Request) {
  const body = (await request.json()) as ClassifyRequest;
  if (!body.posts?.length || body.posts.length > 12)
    return NextResponse.json({ error: "Envía entre 1 y 12 publicaciones." }, { status: 400 });

  try {
    const { result } = await withFreeModels(async (model, vision) => {
      const { output } = await generateText({
        model,
        system:
          "Clasifica cada publicación de Instagram de un restaurante: qué muestra (drink, plato, ambiente, personas, arte u otro) y si la foto se siente de día o de noche. Devuelve una entrada por publicación, con su mismo id.",
        output: Output.object({ schema }),
        messages: [
          {
            role: "user",
            content: body.posts.flatMap((post) => [
              {
                type: "text" as const,
                text: `Publicación id=${post.id} · título: ${post.title || "sin título"} · copy: ${post.caption.slice(0, 200) || "(vacío)"}${
                  post.brightness !== undefined ? ` · luminosidad ${post.brightness}/100` : ""
                }`,
              },
              ...(vision && post.image
                ? [{ type: "file" as const, mediaType: "image/jpeg", data: post.image }]
                : []),
            ]),
          },
        ],
      });
      const known = new Set(body.posts.map((p) => p.id));
      const tags = (output?.tags ?? []).filter((t) => known.has(t.id));
      if (!tags.length) throw new Error("Respuesta vacía");
      return tags;
    });
    return NextResponse.json({ tags: result });
  } catch (error) {
    return NextResponse.json(
      { error: "No pude revisar las fotos. Intenta de nuevo.", detail: String(error).slice(0, 900) },
      { status: 502 },
    );
  }
}
