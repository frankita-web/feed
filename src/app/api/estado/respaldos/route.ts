import { get, list } from "@vercel/blob";
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
  return NextResponse.json({ backups: backups.slice(0, 40) });
}
