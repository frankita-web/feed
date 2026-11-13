"use client";

import { readLocal } from "./images";

/**
 * Marcos para las fotos (pedido de Franca para Issi, 13 nov 2026): la foto entera sobre un fondo,
 * con margen, como en una galería. Los márgenes son fracción del ancho del cuadro (arriba, derecha, abajo, izquierda).
 */
export type Frame = {
  id: string;
  name: string;
  bg: string;
  pad: [number, number, number, number];
  /** Sombra suave bajo la foto, como una hoja sobre la mesa. */
  shadow?: boolean;
  /** Línea fina alrededor de la foto. */
  line?: string;
};

export const FRAMES: Frame[] = [
  { id: "galeria", name: "Galería", bg: "#ffffff", pad: [0.09, 0.09, 0.09, 0.09] },
  { id: "paspartu", name: "Paspartú", bg: "#f3efe6", pad: [0.16, 0.16, 0.16, 0.16] },
  { id: "polaroid", name: "Polaroid", bg: "#ffffff", pad: [0.06, 0.06, 0.24, 0.06] },
  { id: "libro", name: "Libro", bg: "#e8e7e3", pad: [0.2, 0.2, 0.2, 0.2], shadow: true },
  { id: "negro", name: "Negro", bg: "#141212", pad: [0.11, 0.11, 0.11, 0.11] },
  { id: "linea", name: "Línea fina", bg: "#ffffff", pad: [0.13, 0.13, 0.13, 0.13], line: "#1d1818" },
];

export const frameOf = (id?: string) => FRAMES.find((f) => f.id === id);

/** Estilo del contenedor del cuadro (el padding en % de CSS es del ancho, igual que `pad`). */
export const frameBoxStyle = (f: Frame) => ({
  background: f.bg,
  padding: f.pad.map((p) => `${p * 100}%`).join(" "),
});

/** Estilo de la foto dentro del marco. */
export const frameImageStyle = (f: Frame) => ({
  boxShadow: f.shadow ? "0 6px 18px rgba(0,0,0,.18)" : undefined,
  outline: f.line ? `1px solid ${f.line}` : undefined,
  outlineOffset: f.line ? "4px" : undefined,
});

async function blobOf(id: string) {
  if (id.startsWith("/")) return fetch(id).then((r) => (r.ok ? r.blob() : null));
  return readLocal(id);
}

/** La foto con su marco, lista para subir a Instagram (1080 × 1440, el cuadro 3:4 del feed). */
export async function framedJpeg(id: string, f: Frame) {
  const blob = await blobOf(id);
  if (!blob || !blob.type.startsWith("image/")) throw new Error("Esa foto no se pudo abrir.");
  const bitmap = await createImageBitmap(blob);
  const W = 1080;
  const H = 1440;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  g.fillStyle = f.bg;
  g.fillRect(0, 0, W, H);
  const [t, r, b, l] = f.pad.map((p) => p * W);
  const boxW = W - l - r;
  const boxH = H - t - b;
  const scale = Math.min(boxW / bitmap.width, boxH / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  const x = l + (boxW - w) / 2;
  const y = t + (boxH - h) / 2;
  if (f.shadow) {
    g.save();
    g.shadowColor = "rgba(0,0,0,.18)";
    g.shadowBlur = 40;
    g.shadowOffsetY = 14;
    g.fillStyle = f.bg;
    g.fillRect(x, y, w, h);
    g.restore();
  }
  g.drawImage(bitmap, x, y, w, h);
  if (f.line) {
    const gap = 12;
    g.strokeStyle = f.line;
    g.lineWidth = 2;
    g.strokeRect(x - gap, y - gap, w + gap * 2, h + gap * 2);
  }
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((out) => (out ? resolve(out) : reject(new Error("toBlob"))), "image/jpeg", 0.92),
  );
}

/** Descarga la portada y las demás fotos del carrusel, cada una con el marco. */
export async function downloadFramed(ids: string[], f: Frame, name: string) {
  let n = 0;
  for (const [i, id] of ids.entries()) {
    const blob = await framedJpeg(id, f).catch(() => null);
    if (!blob) continue;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name || "foto"}${ids.length > 1 ? ` ${i + 1}` : ""} - marco ${f.name}.jpg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    n++;
  }
  return n;
}
