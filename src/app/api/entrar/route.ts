import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, cookieOptions, sessionFor, validSession } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };
  // Pausa corta: hace impráctico probar claves una tras otra.
  await new Promise((resolve) => setTimeout(resolve, 600));
  const session = await sessionFor(password ?? "");
  if (!session) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, session, cookieOptions);
  return response;
}

/** Link personal: abrirlo una vez deja el dispositivo adentro, sin escribir la clave. */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("llave") ?? undefined;
  const allowed = await validSession(key);
  const response = NextResponse.redirect(new URL(allowed ? "/" : "/entrar", request.url));
  if (allowed) response.cookies.set(COOKIE, key!, cookieOptions);
  return response;
}
