"use client";

import { newPost } from "./store";
import { storeFile, storeImage } from "./images";
import type { Attachment, Deliverable, Format, Post } from "./types";

/** Primer cuadro de un video (a los 0.5 s) como imagen, para usarlo de portada. */
async function videoFrame(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    await new Promise((ok, fail) => {
      video.onloadeddata = ok;
      video.onerror = fail;
    });
    video.currentTime = Math.min(0.5, video.duration / 2 || 0);
    await new Promise((ok) => (video.onseeked = ok));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    return blob && new File([blob], "portada.jpg", { type: "image/jpeg" });
  } catch {
    return null; // formato que el navegador no puede leer: queda sin portada
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Guarda fotos y videos entregados. La primera imagen (o cuadro de video) es la portada. */
export async function storeMedia(list: File[], hasCover: boolean) {
  const images: string[] = [];
  const files: Attachment[] = [];
  for (const file of list) {
    if (file.type.startsWith("image/")) {
      images.push(await storeImage(file));
      continue;
    }
    files.push({ id: await storeFile(file), name: file.name, type: file.type, size: file.size });
    if (!hasCover && !images.length && file.type.startsWith("video/")) {
      const frame = await videoFrame(file);
      if (frame) images.push(await storeImage(frame));
    }
  }
  return {
    cover: hasCover ? null : (images[0] ?? null),
    slides: hasCover ? images : images.slice(1),
    files,
  };
}

const FORMAT: Record<Deliverable["kind"], Format> = {
  Video: "Reel vertical",
  Fotos: "Foto",
  Carrusel: "Post carrusel",
  Otro: "Tbc",
};

/** Publicación nueva (sin fecha todavía) armada con el material de un entregable. */
export function postFromDeliverable(project: string, item: Deliverable): Post {
  return newPost(project, {
    title: item.title,
    format: item.kind === "Fotos" && item.slides.length ? "Post carrusel" : FORMAT[item.kind],
    image: item.cover,
    slides: item.slides,
    files: item.files,
    caption: item.note ?? "",
  });
}
