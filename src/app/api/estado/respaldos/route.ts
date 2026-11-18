import { copy, get, head, list } from "@vercel/blob";
import { NextResponse, connection } from "next/server";

// Copias guardadas del contenido (ver api/estado): antes de reemplazar una versión por otra y
// antes de los cambios grandes del feed (reordenar, poner fechas). Sirven para recuperar algo.
const PREFIX = "respaldos/";

/** Sin `path`: la lista de copias, la más nueva primero. Con `path`: el contenido de esa copia. */
export async function GET(request: Request) {
  await connection();
  const path = new URL(request.url).searchParams.get("path");

  if (path) {
    if (!path.startsWith(PREFIX) || path.includes(".."))
      return NextResponse.json({ error: "Respaldo inválido" }, { status: 400 });
    const result = await get(path, { access: "private", useCache: false });
    if (result?.statusCode !== 200)
      return NextResponse.json({ error: "No se encontró el respaldo" }, { status: 404 });
    return new Response(result.stream, { headers: { "Content-Type": "application/json" } });
  }

  const backups: { path: string; at: string; size: number }[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const result = await list({ prefix: PREFIX, cursor, limit: 1000 });
    backups.push(
      ...result.blobs.map((b) => ({
        path: b.pathname,
        at: new Date(b.uploadedAt).toISOString(),
        size: b.size,
      })),
    );
    if (!result.hasMore) break;
    cursor = result.cursor;
  }
  backups.sort((a, b) => b.at.localeCompare(a.at));
  // Tamaño del archivo principal, para revisar si algo anda mal.
  const main = await head("estado.json").catch(() => null);
  return NextResponse.json({
    backups: backups.slice(0, 40),
    estado: main ? { size: main.size, at: new Date(main.uploadedAt).toISOString() } : null,
  });
}

/**
 * Guarda una copia del archivo principal tal como está en internet ahora, sin bajarlo (se copia
 * dentro del almacenamiento). Sirve para no perder una versión antes de que se reemplace.
 */
export async function POST(request: Request) {
  await connection();
  const { reason } = (await request.json().catch(() => ({}))) as { reason?: string };
  const tag = (reason ?? "copia").replace(/[^a-z0-9-]/gi, "").slice(0, 30) || "copia";
  const main = await head("estado.json");
  const stamp = new Date(main.uploadedAt).toISOString().replace(/[:.]/g, "-");
  const result = await copy(main.url, `${PREFIX}estado-${stamp}-${tag}.json`, {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: true,
  });
  return NextResponse.json({ path: result.pathname });
}
