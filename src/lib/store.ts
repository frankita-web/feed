"use client";

import { useSyncExternalStore } from "react";
import { seedState } from "./seed";
import type { Post, Project, State } from "./types";

// Todo vive en el navegador (localStorage + IndexedDB para imágenes).
const KEY = "feed-planner:v1";

let state: State | null = null;
const listeners = new Set<() => void>();

function read(): State {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as State) : seedState();
  } catch {
    state = seedState();
  }
  return state;
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
