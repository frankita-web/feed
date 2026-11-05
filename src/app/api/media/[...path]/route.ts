import { del, get } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";

type Context = { params: Promise<{ path: string[] }> };

async function mediaPath({ params }: Context) {
  const path = (await params).path.join("/");
  return path.startsWith("media/") ? path : null;
}

/** Entrega fotos y videos del almacenamiento privado (la clave la revisa proxy.ts). */
export async function GET(request: NextRequest, context: Context) {
  const path = await mediaPath(context);
  if (!path) return new NextResponse("No encontrado", { status: 404 });

  // Los videos piden pedazos del archivo para poder adelantarlos.
  const range = request.headers.get("range");
  const result = await get(path, {
    access: "private",
    ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    headers: range ? { range } : undefined,
  });
  if (!result) return new NextResponse("No encontrado", { status: 404 });

  const headers = new Headers({
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
    ETag: result.blob.etag,
  });
  if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers });

  headers.set("Content-Type", result.blob.contentType);
  for (const name of ["content-length", "content-range"]) {
    const value = result.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(result.stream, {
    status: headers.has("content-range") ? 206 : 200,
    headers,
  });
}

export async function DELETE(_request: NextRequest, context: Context) {
  const path = await mediaPath(context);
  if (!path) return new NextResponse("No encontrado", { status: 404 });
  await del(path);
  return NextResponse.json({ ok: true });
}
