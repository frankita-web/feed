"use client";

import { useEffect, useSyncExternalStore } from "react";

const DB_NAME = "feed-planner";
const STORE = "images";

let dbPromise: Promise<IDBDatabase> | null = null;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  const d = await db();
  return new Promise<T>((resolve, reject) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Cache de object URLs compartida por todos los componentes.
const urls = new Map<string, string | null>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function load(id: string) {
  if (urls.has(id)) return;
  urls.set(id, null);
  run<Blob | undefined>("readonly", (s) => s.get(id)).then((blob) => {
    if (blob) urls.set(id, URL.createObjectURL(blob));
    notify();
  });
}

export function useImageUrl(id: string | null) {
  const url = useSyncExternalStore(
    subscribe,
    () => (id ? (urls.get(id) ?? null) : null),
    () => null,
  );
  useEffect(() => {
    if (id) load(id);
  }, [id]);
  return url;
}

/** Reduce la imagen a 1080px de ancho máx. (lo que usa Instagram) y la guarda. */
export async function storeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1080 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.85),
  );

  const id = crypto.randomUUID();
  await run("readwrite", (s) => s.put(blob, id));
  urls.set(id, URL.createObjectURL(blob));
  notify();
  return id;
}

export async function removeImage(id: string) {
  await run("readwrite", (s) => s.delete(id));
  urls.delete(id);
  notify();
}
