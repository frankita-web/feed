import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, validSession } from "@/lib/auth";

/** Toda la página pide la clave, salvo la pantalla para escribirla. */
export async function proxy(request: NextRequest) {
  if (await validSession(request.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/"))
    return NextResponse.json({ error: "Falta la clave" }, { status: 401 });
  const login = new URL("/entrar", request.url);
  if (pathname !== "/") login.searchParams.set("volver", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|entrar|api/entrar|favicon|icon|apple-icon).*)"],
};
