import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import type { AgendaItem } from "@/lib/agenda";

// En local se usa otro archivo, para que las pruebas nunca toquen la agenda real.
export const AGENDA_FILE = process.env.VERCEL ? "agenda.json" : "dev-agenda.json";

/** Guarda la copia de la agenda que manda el navegador (la clave la revisa proxy.ts). */
export async function PUT(request: Request) {
  const { items } = (await request.json()) as { items: AgendaItem[] };
  if (!Array.isArray(items)) return NextResponse.json({ error: "Agenda inválida" }, { status: 400 });
  await put(AGENDA_FILE, JSON.stringify({ items, savedAt: new Date().toISOString() }), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  return NextResponse.json({ ok: true, count: items.length });
}
