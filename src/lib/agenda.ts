"use client";

import { addDays, todayKey } from "./dates";
import type { State } from "./types";

// Copia en internet de lo que viene (solo lectura), para el mail de las 8:00.
// El calendario sigue viviendo en el navegador: esto solo copia la agenda.
export type AgendaItem = {
  project: string;
  date: string;
  time?: string;
  title: string;
  format: string;
  caption: string;
  videoLink?: string;
};

let timer: ReturnType<typeof setTimeout> | undefined;
let lastSent = "";

function agendaOf(state: State): AgendaItem[] {
  const from = addDays(todayKey(), -1);
  const names = new Map(state.projects.map((p) => [p.slug, p.name]));
  return state.posts
    .filter((p) => p.status !== "publicado" && p.date && p.date >= from)
    .sort((a, b) => a.date!.localeCompare(b.date!) || (a.time ?? "").localeCompare(b.time ?? ""))
    .map((p) => ({
      project: names.get(p.project) ?? p.project,
      date: p.date!,
      time: p.time,
      title: p.title,
      format: p.format,
      caption: p.caption,
      videoLink: p.videoLink,
    }));
}

/** Sube la agenda unos segundos después del último cambio, y solo si cambió. */
export function scheduleAgenda(state: State) {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const body = JSON.stringify({ items: agendaOf(state) });
    if (body === lastSent) return;
    const response = await fetch("/api/agenda", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    }).catch(() => null);
    if (response?.ok) lastSent = body;
  }, 8000);
}
