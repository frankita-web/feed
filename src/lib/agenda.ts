"use client";

import { addDays, todayKey } from "./dates";
import type { Post, State } from "./types";

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
  /** Fotos guardadas en internet ("/api/media/…"), portada primero. */
  photos?: string[];
};

// Fotos de lo que viene que estaban solo en este navegador: se suben una vez (copia aparte,
// sin cambiar la publicación) y se recuerda su dirección.
const UPLOADED = "feed-planner:fotos-agenda";

function uploadedMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(UPLOADED) ?? "{}");
  } catch {
    return {};
  }
}

async function onlinePhotos(post: Post, soon: boolean) {
  const ids = [post.image, ...(post.slides ?? [])].filter((id): id is string => !!id).slice(0, 10);
  const known = uploadedMap();
  const photos: string[] = [];
  for (const id of ids) {
    if (id.startsWith("/api/media/") || id.startsWith("/feed/")) photos.push(id);
    else if (known[id]) photos.push(known[id]);
    else if (soon && !id.startsWith("/")) {
      try {
        const { pushFile } = await import("./bank");
        const { url } = await pushFile(id);
        known[id] = url;
        localStorage.setItem(UPLOADED, JSON.stringify(known));
        photos.push(url);
      } catch (error) {
        console.error(error);
      }
    }
  }
  return photos;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let lastSent = "";

async function agendaOf(state: State): Promise<AgendaItem[]> {
  const from = addDays(todayKey(), -1);
  const soon = addDays(todayKey(), 21); // fotos solo de las próximas 3 semanas
  const names = new Map(state.projects.map((p) => [p.slug, p.name]));
  const posts = state.posts
    .filter((p) => p.status !== "publicado" && p.date && p.date >= from)
    .sort((a, b) => a.date!.localeCompare(b.date!) || (a.time ?? "").localeCompare(b.time ?? ""));
  const items: AgendaItem[] = [];
  for (const p of posts)
    items.push({
      project: names.get(p.project) ?? p.project,
      date: p.date!,
      time: p.time,
      title: p.title,
      format: p.format,
      caption: p.caption,
      videoLink: p.videoLink,
      photos: await onlinePhotos(p, p.date! <= soon),
    });
  return items;
}

/** Sube la agenda unos segundos después del último cambio, y solo si cambió. */
export function scheduleAgenda(state: State) {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const body = JSON.stringify({ items: await agendaOf(state) });
    if (body === lastSent) return;
    const response = await fetch("/api/agenda", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    }).catch(() => null);
    if (response?.ok) lastSent = body;
  }, 8000);
}
