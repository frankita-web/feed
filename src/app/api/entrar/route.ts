import { NextResponse } from "next/server";
import { COOKIE, YEAR, sessionFor } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };
  // Pausa corta: hace impráctico probar claves una tras otra.
  await new Promise((resolve) => setTimeout(resolve, 600));
  const session = await sessionFor(password ?? "");
  if (!session) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: YEAR,
  });
  return response;
}
