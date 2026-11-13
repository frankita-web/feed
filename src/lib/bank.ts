"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useSyncExternalStore } from "react";
import { isLocal, readLocal, removeImage } from "./images";
import {
  dropLocalBankItem,
  localBank,
  removeFromBank,
  updateLocalBankItem,
  usedLocally,
} from "./store";
import type { BankItem } from "./types";

// El banco vive en internet. Lo que se sube entra primero a la lista local de este navegador
// y syncBank lo pasa a internet; también traslada lo que ya estaba guardado solo aquí.
export const BANK_LIMIT = 1024 ** 3; // 1 GB incluido en el plan de Vercel

type Snapshot = { items: BankItem[]; loaded: boolean; moving: number; failed: boolean };

let snapshot: Snapshot = { items: [], loaded: false, moving: 0, failed: false };
const listeners = new Set<() => void>();

function update(fields: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...fields };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function call(init?: RequestInit) {
  const response = await fetch("/api/banco", { cache: "no-store", ...init });
  if (response.status === 401)
    location.href = `/entrar?volver=${encodeURIComponent(location.pathname)}`;
  if (!response.ok) throw new Error(`banco: ${response.status}`);
  return ((await response.json()) as { items: BankItem[] }).items;
}

const post = (body: { add?: BankItem[]; remove?: string[] }) =>
  call({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

async function refresh() {
  try {
    update({ items: await call(), loaded: true });
  } catch (error) {
    console.error(error);
  }
}

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

/** Sube un archivo del navegador a internet y devuelve su dirección. */
export async function pushFile(id: string) {
  const blob = await readLocal(id);
  if (!blob) throw new Error(`Falta el archivo ${id}`);
  const name = `media/${crypto.randomUUID()}.${EXTENSION[blob.type] ?? "bin"}`;
  await upload(name, blob, {
    access: "private",
    handleUploadUrl: "/api/subir",
    contentType: blob.type,
    multipart: blob.size > 20 * 1024 * 1024,
  });
  return { url: `/api/media/${name}`, size: blob.size };
}

/** Pasa a internet los archivos de un item, recordando lo avanzado por si se corta. */
async function pushItem(start: BankItem) {
  let item = start;
  let bytes = item.bytes ?? 0;
  if (item.image && isLocal(item.image)) {
    const { url, size } = await pushFile(item.image);
    bytes += size;
    item = { ...item, image: url, bytes };
    updateLocalBankItem(item);
  }
  for (const file of item.files) {
    if (!isLocal(file.id)) continue;
    const { url, size } = await pushFile(file.id);
    bytes += size;
    item = {
      ...item,
      bytes,
      files: item.files.map((f) => (f.id === file.id ? { ...f, id: url } : f)),
    };
    updateLocalBankItem(item);
  }
  return item;
}

let running = false;

async function sweep() {
  let failed = false;
  for (const item of localBank()) {
    const originals = [item.image, ...item.files.map((f) => f.id)].filter(
      (id): id is string => !!id && isLocal(id),
    );
    try {
      const moved = await pushItem(item);
      update({ items: await post({ add: [moved] }), loaded: true });
      // Recién aquí, con el item ya guardado en internet, se libera el navegador.
      dropLocalBankItem(item.id);
      await Promise.all(originals.filter((id) => !usedLocally(id)).map(removeImage));
    } catch (error) {
      console.error(error);
      failed = true;
    }
    update({ moving: localBank().length, failed });
  }
}

/** Sube lo pendiente. Si algo falla, queda en el navegador y se reintenta la próxima vez. */
export async function syncBank() {
  if (running || !localBank().length) return;
  running = true;
  update({ moving: localBank().length, failed: false });
  try {
    // Con varias pestañas abiertas, solo una sube.
    if (navigator.locks) await navigator.locks.request("feed-banco", sweep);
    else await sweep();
  } finally {
    running = false;
  }
}

/** Marca fotos del banco como organizadas en el feed, sin sacarlas del banco. */
export async function markInFeed(items: BankItem[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
  update({ items: snapshot.items.map((x) => byId.get(x.id) ?? x) });
  await post({ add: items }).catch((error) => {
    console.error(error);
    refresh();
  });
}

/** Saca el item del banco (la foto ya pasó al feed, así que el archivo se conserva). */
export async function takeFromBank(id: string) {
  update({ items: snapshot.items.filter((x) => x.id !== id) });
  await post({ remove: [id] }).catch((error) => {
    console.error(error);
    refresh();
  });
}

/** Borra el item y sus archivos. */
export async function deleteBankItem(item: BankItem) {
  removeFromBank(item.id);
  update({ items: snapshot.items.filter((x) => x.id !== item.id) });
  try {
    await post({ remove: [item.id] });
    await Promise.all(
      [item.image, ...item.files.map((f) => f.id)]
        .filter((id): id is string => !!id)
        .map(removeImage),
    );
  } catch (error) {
    console.error(error);
    alert("No se pudo quitar del banco. Revisa tu conexión e inténtalo de nuevo.");
    refresh();
  }
}

/** Banco completo: lo guardado en internet más lo que todavía está subiendo. */
export function useBank(pending: BankItem[] = []) {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );
  useEffect(() => {
    if (!snapshot.loaded) refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  useEffect(() => {
    syncBank();
  }, [pending.length]);
  const saved = new Set(state.items.map((x) => x.id));
  return {
    ...state,
    items: [...pending.filter((x) => !saved.has(x.id)), ...state.items],
    used: state.items.reduce((sum, x) => sum + (x.bytes ?? 0), 0),
  };
}
