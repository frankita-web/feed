"use client";

import { upload } from "@vercel/blob/client";
import { addToBank } from "./store";
import { localFileIds, readLocal } from "./images";
import type { BankItem, Post } from "./types";

// Rescate puntual: fotos y videos borrados del almacenamiento que siguen en la memoria de este
// navegador. Solo agrega archivos: no borra ni cambia nada de lo que ya existe.
const STATE = "feed-planner:v1";
const FILES = /\/api\/media\/(media\/[\w.-]+)/g;

function banner(text: string, final = false) {
  let box = document.getElementById("rescate");
  if (!box) {
    box = document.createElement("div");
    box.id = "rescate";
    box.setAttribute("role", "status");
    box.style.cssText =
      "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;max-width:min(560px,90vw);" +
      "background:#1d1818;color:#fff;padding:12px 16px;border-radius:16px;font-size:13px;line-height:1.4;" +
      "box-shadow:0 8px 24px rgba(0,0,0,.25);white-space:pre-line";
    document.body.append(box);
  }
  box.textContent = text;
  if (final) box.onclick = () => box.remove();
}

/** Nombre con que Franca reconoce cada archivo. */
function namesOf(bank: BankItem[], posts: Post[]) {
  const names = new Map<string, string>();
  for (const { name, image, files } of bank)
    for (const id of [image, ...files.map((f) => f.id)]) if (id) names.set(id, name);
  for (const post of posts)
    for (const id of [post.image, ...(post.slides ?? []), ...(post.files ?? []).map((f) => f.id)])
      if (id) names.set(id, post.title || "publicación sin título");
  return names;
}

/** El archivo completo guardado en la memoria del navegador, sin pedirlo a internet. */
async function fromBrowser(url: string) {
  const response = await fetch(url, { cache: "only-if-cached", mode: "same-origin" }).catch(
    () => null,
  );
  if (response?.status !== 200) return null;
  const blob = await response.blob();
  const expected = Number(response.headers.get("content-length") ?? blob.size);
  return blob.size === expected ? blob : null;
}

/** Archivos que quedaron en el navegador sin que nada los use: pasan al banco. */
async function adoptLeftovers(json: string) {
  const items: BankItem[] = [];
  for (const id of await localFileIds()) {
    if (json.includes(`"${id}"`)) continue;
    const blob = await readLocal(id);
    if (!blob || !/^(image|video)\//.test(blob.type)) continue;
    const name = `Recuperado ${items.length + 1}`;
    const video = blob.type.startsWith("video/");
    items.push({
      id: crypto.randomUUID(),
      project: /\/proyecto\/([^/]+)/.exec(location.pathname)?.[1] ?? "cancino",
      name,
      image: video ? null : id,
      files: video ? [{ id, name, type: blob.type, size: blob.size }] : [],
      createdAt: Date.now(),
    });
  }
  if (items.length) addToBank(items);
  return items.length;
}

export async function rescue() {
  const response = await fetch("/api/banco", { cache: "no-store" });
  if (!response.ok) return;
  const { items: bank } = (await response.json()) as { items: BankItem[] };
  const raw = localStorage.getItem(STATE) ?? "{}";
  const posts = ((JSON.parse(raw) as { posts?: Post[] }).posts ?? []).filter(Boolean);
  const json = raw + JSON.stringify(bank);
  const names = namesOf(bank, posts);
  const paths = [...new Set([...json.matchAll(FILES)].map((m) => m[1]))];

  const missing: string[] = [];
  for (const path of paths) {
    const check = await fetch(`/api/media/${path}`, { method: "HEAD", cache: "no-store" });
    if (check.status === 404) missing.push(path);
  }

  const leftovers = await adoptLeftovers(json);
  if (!missing.length) {
    if (leftovers) banner(`Encontramos ${leftovers} archivos en este navegador: están en el banco.`, true);
    return;
  }

  let saved = 0;
  const lost: string[] = [];
  for (const [i, path] of missing.entries()) {
    banner(`Recuperando tus archivos… ${i + 1} de ${missing.length}. No cierres la página.`);
    const url = `/api/media/${path}`;
    try {
      const blob = await fromBrowser(url);
      if (!blob) throw new Error("no está en este navegador");
      await upload(path, blob, {
        access: "private",
        handleUploadUrl: "/api/subir",
        contentType: blob.type,
        multipart: blob.size > 20 * 1024 * 1024,
      });
      saved += 1;
    } catch (error) {
      console.error(path, error);
      lost.push(names.get(url) ?? path);
    }
  }

  const extra = leftovers ? `\nAdemás hay ${leftovers} archivos recuperados en el banco.` : "";
  const failed = lost.length ? `\nNo se pudieron: ${[...new Set(lost)].join(", ")}.` : "";
  banner(
    `Recuperamos ${saved} de ${missing.length} archivos.${failed}${extra}\nToca este aviso para cerrarlo y recarga la página.`,
    true,
  );
}
