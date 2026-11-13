import { get } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";
import { validPhotoSignature } from "@/lib/photo-link";

/** Entrega una foto con link firmado (para el mail de las 8:00). Sin firma válida, nada. */
export async function GET(request: NextRequest) {
  const media = request.nextUrl.searchParams.get("p") ?? "";
  const signature = request.nextUrl.searchParams.get("s") ?? "";
  if (!(await validPhotoSignature(media, signature)))
    return new NextResponse("No encontrado", { status: 404 });
  const result = await get(media, { access: "private" });
  if (result?.statusCode !== 200) return new NextResponse("No encontrado", { status: 404 });
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
