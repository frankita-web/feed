import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, cookieOptions, validSession } from "@/lib/auth";

/** Toda la página pide la clave, salvo la pantalla para escribirla. */
export async function proxy(request: NextRequest) {
  const session = request.cookies.get(COOKIE)?.value;
  const { pathname, search } = request.nextUrl;
  if (await validSession(session)) {
    const response = NextResponse.next();
    // Se renueva al usar la página, para que nunca vuelva a pedir la clave en este dispositivo.
    if (pathname === "/api/banco") response.cookies.set(COOKIE, session!, cookieOptions);
    return response;
  }
  if (pathname.startsWith("/api/"))
    return NextResponse.json({ error: "Falta la clave" }, { status: 401 });
  const login = new URL("/entrar", request.url);
  if (pathname !== "/") login.searchParams.set("volver", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|entrar|api/entrar|api/recordatorio|favicon|icon|apple-icon).*)"],
};
