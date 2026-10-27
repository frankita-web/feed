"use client";

import { useSyncExternalStore } from "react";
import {
  CANCINO_HISTORY_POSTS,
  CANCINO_NOTES,
  CANCINO_PINNED,
  CANCINO_PLANNED_IMAGES,
  CANCINO_PUBLISHED,
  CRISSIS_POSTS,
  SEED_VERSION,
  seedState,
} from "./seed";
import type { Post, Project, State } from "./types";

// Todo vive en el navegador (localStorage + IndexedDB para imágenes).
const KEY = "feed-planner:v1";

let state: State | null = null;
const listeners = new Set<() => void>();

function read(): State {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? migrate(JSON.parse(raw) as State) : seedState();
  } catch {
    state = seedState();
  }
  return state;
}

// Colores originales de Crissis e Issi → paleta pastel actual.
const OLD_COLORS: Record<string, { bg: string; accent: string }> = {
  "#f4e4c4": { bg: "#f6e7d6", accent: "#c2876a" },
  "#cfe1f4": { bg: "#dfe8f6", accent: "#7f99c9" },
};

// Instagram de proyectos que se crearon sin usuario.
const HANDLES: Record<string, string> = {
  crissis: "crissis.crissisbistro",
  issi: "issi_rest",
};

function migrate(s: State): State {
  let posts = s.posts;
  // v2: fotos del Instagram actual de Cancino en los posts de octubre ya subidos.
  if ((s.version ?? 1) < 2) {
    posts = posts.map((p) => {
      const i = /^seed-cancino-(\d+)$/.exec(p.id)?.[1];
      const patch = i !== undefined ? CANCINO_PUBLISHED[Number(i)] : undefined;
      return patch && !p.image ? { ...p, ...patch } : p;
    });
    if (!posts.some((p) => p.id === CANCINO_PINNED.id)) posts = [...posts, CANCINO_PINNED];
  }
  let notes = s.notes;
  // v3: julio–septiembre y fotos del feed armado en Canva.
  if ((s.version ?? 1) < 3) {
    posts = posts.map((p) => {
      const i = /^seed-cancino-(\d+)$/.exec(p.id)?.[1];
      const image = i !== undefined ? CANCINO_PLANNED_IMAGES[Number(i)] : undefined;
      return image && !p.image ? { ...p, image } : p;
    });
    const ids = new Set(posts.map((p) => p.id));
    posts = [...posts, ...CANCINO_HISTORY_POSTS.filter((p) => !ids.has(p.id))];
    notes = { ...notes };
    for (const [date, text] of Object.entries(CANCINO_NOTES))
      if (date < "2026-10") notes[`cancino:${date}`] ??= text;
  }
  // v4: feed actual de Crissis.
  if ((s.version ?? 1) < 4) {
    const ids = new Set(posts.map((p) => p.id));
    posts = [...posts, ...CRISSIS_POSTS.filter((p) => !ids.has(p.id))];
  }
  let projects = s.projects;
  // v5: categoría Postre en Cancino, con el crumble.
  if ((s.version ?? 1) < 5) {
    projects = projects.map((p) =>
      p.slug === "cancino" && !p.pillars.some((x) => x.name === "Postre")
        ? { ...p, pillars: [...p.pillars, { name: "Postre", target: 1 }] }
        : p,
    );
    posts = posts.map((p) =>
      p.id === "seed-cancino-1" && !p.pillar ? { ...p, pillar: "Postre" } : p,
    );
  }
  return {
    ...s,
    version: SEED_VERSION,
    posts,
    notes,
    projects: projects.map((p) => ({
      ...p,
      ...OLD_COLORS[p.bg],
      instagram: p.instagram || HANDLES[p.slug] || "",
    })),
  };
}

function write(next: State) {
  state = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    state = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** `null` durante el render en servidor, antes de leer localStorage. */
export function useStore(): State | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function saveProject(project: Project, previousSlug?: string) {
  const s = read();
  const exists = s.projects.some((p) => p.slug === (previousSlug ?? project.slug));
  write({
    ...s,
    projects: exists
      ? s.projects.map((p) => (p.slug === (previousSlug ?? project.slug) ? project : p))
      : [...s.projects, project],
  });
}

export function savePost(post: Post) {
  const s = read();
  const exists = s.posts.some((p) => p.id === post.id);
  write({
    ...s,
    posts: exists ? s.posts.map((p) => (p.id === post.id ? post : p)) : [...s.posts, post],
  });
}

/** Guarda varias publicaciones de una vez (p. ej. al intercambiar su orden). */
export function savePosts(changed: Post[]) {
  const s = read();
  const byId = new Map(changed.map((p) => [p.id, p]));
  write({ ...s, posts: s.posts.map((p) => byId.get(p.id) ?? p) });
}

export function addPosts(posts: Post[]) {
  const s = read();
  write({ ...s, posts: [...s.posts, ...posts] });
}

export function deletePost(id: string) {
  const s = read();
  write({ ...s, posts: s.posts.filter((p) => p.id !== id) });
}

export function saveNote(slug: string, date: string, text: string) {
  const s = read();
  const notes = { ...s.notes };
  const key = `${slug}:${date}`;
  if (text.trim()) notes[key] = text.trim();
  else delete notes[key];
  write({ ...s, notes });
}

export function newPost(project: string, fields: Partial<Post> = {}): Post {
  return {
    id: crypto.randomUUID(),
    project,
    date: null,
    title: "",
    format: "Reel vertical",
    status: "pendiente",
    pillar: null,
    caption: "",
    image: null,
    createdAt: Date.now(),
    ...fields,
  };
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
