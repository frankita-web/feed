import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { NextResponse, connection } from "next/server";
import type { State } from "@/lib/types";

// Todo el contenido (proyectos, publicaciones, ideas, guiones, shoots, notas) en un solo archivo
// en internet, para que se vea igual en cualquier computador o celular. Ver lib/sync.ts.
const FILE = "estado.json";

export type Saved = { rev: number; savedAt: number; state: State };

async function readSaved() {
  const result = await get(FILE, { access: "private", useCache: false });
  if (result?.statusCode !== 200) return { saved: null, etag: undefined };
  const saved = (await new Response(result.stream).json()) as Saved;
  // Los archivos grandes llegan con la marca "W/", que el almacenamiento no acepta al guardar.
  return { saved, etag: result.blob.etag.replace(/^W\//, "") };
}

/** Copia aparte que nunca se pisa: se guarda antes de reemplazar una versión por otra. */
async function backup(state: State, reason: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await put(`respaldos/estado-${stamp}-${reason}.json`, JSON.stringify(state), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: true,
  });
}

const valid = (state: State | undefined): state is State =>
  !!state && Array.isArray(state.posts) && Array.isArray(state.projects);

export async function GET() {
  await connection();
  const { saved } = await readSaved();
  return NextResponse.json({ saved });
}

/**
 * Guarda el contenido sobre la versión `baseRev`. Si otro computador guardó entre medio, responde
 * 409 con lo que hay, en vez de pisarlo. Con `force`, reemplaza, pero respalda lo anterior.
 */
export async function PUT(request: Request) {
  const { state, baseRev, force } = (await request.json()) as {
    state?: State;
    baseRev: number | null;
    force?: boolean;
  };
  if (!valid(state)) return NextResponse.json({ error: "Contenido inválido" }, { status: 400 });

  for (let attempt = 0; attempt < 5; attempt++) {
    const { saved, etag } = await readSaved();
    if (saved && saved.rev !== baseRev && !force)
      return NextResponse.json({ saved }, { status: 409 });
    if (saved && force && saved.rev !== baseRev) await backup(saved.state, "reemplazado");

    const next: Saved = { rev: (saved?.rev ?? 0) + 1, savedAt: Date.now(), state };
    try {
      await put(FILE, JSON.stringify(next), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        cacheControlMaxAge: 60,
        // Sin etag el archivo todavía no existe: se crea solo si nadie lo creó antes.
        ...(etag ? { ifMatch: etag } : {}),
      });
      return NextResponse.json({ rev: next.rev, savedAt: next.savedAt });
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) continue;
      if (!etag && (await readSaved()).saved) continue;
      throw error;
    }
  }
  return NextResponse.json({ error: "No se pudo guardar" }, { status: 503 });
}

/** Respalda una versión que se va a dejar de usar (p. ej. la de un computador). */
export async function POST(request: Request) {
  const { state, reason } = (await request.json()) as { state?: State; reason?: string };
  if (!valid(state)) return NextResponse.json({ error: "Contenido inválido" }, { status: 400 });
  await backup(state, (reason ?? "navegador").replace(/[^a-z0-9-]/gi, "").slice(0, 30) || "navegador");
  return NextResponse.json({ ok: true });
}
