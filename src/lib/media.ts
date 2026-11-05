"use client";

import { newPost } from "./store";
import { storeFile, storeImage } from "./images";
import type { Attachment, Deliverable, Format, Post } from "./types";

/** Link listo para abrir (acepta que se pegue sin https://). */
export function linkUrl(link?: string) {
  if (!link) return undefined;
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

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

// En la página el video solo sirve de referencia: los pesados se guardan en baja calidad.
const HEAVY_VIDEO = 15 * 1024 * 1024;
const VIDEO_BITRATE = 1_200_000;

/**
 * Vuelve a grabar el video con menos calidad. Tarda lo que dura el video.
 * Si el navegador no puede, o no resulta más liviano, se queda el original.
 */
export async function shrinkVideo(file: File): Promise<File> {
  if (file.size < HEAVY_VIDEO || typeof MediaRecorder === "undefined") return file;
  const mimeType = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find(
    (type) => MediaRecorder.isTypeSupported(type),
  );
  const url = URL.createObjectURL(file);
  const video = document.createElement("video") as HTMLVideoElement & {
    captureStream?: () => MediaStream;
  };
  try {
    if (!mimeType || !video.captureStream) return file;
    video.src = url;
    video.playsInline = true;
    video.volume = 0;
    await new Promise((ok, fail) => {
      video.onloadedmetadata = ok;
      video.onerror = fail;
    });
    const recorder = new MediaRecorder(video.captureStream(), {
      mimeType,
      videoBitsPerSecond: VIDEO_BITRATE,
      audioBitsPerSecond: 96_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const stopped = new Promise((ok) => (recorder.onstop = ok));
    const ended = new Promise((ok, fail) => {
      video.onended = ok;
      video.onerror = fail;
    });
    await video.play();
    recorder.start(1000);
    await ended;
    recorder.stop();
    await stopped;
    const type = mimeType.split(";")[0];
    const blob = new Blob(chunks, { type });
    if (!blob.size || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, `.${type.split("/")[1]}`);
    return new File([blob], name, { type });
  } catch (error) {
    console.error(error);
    return file;
  } finally {
    video.pause();
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
    const stored = file.type.startsWith("video/") ? await shrinkVideo(file) : file;
    files.push({
      id: await storeFile(stored),
      name: stored.name,
      type: stored.type,
      size: stored.size,
    });
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
