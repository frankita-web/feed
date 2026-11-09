"use client";

import type { OrganizePlan, OrganizeRequest } from "@/app/api/organizar/route";
import { markInFeed } from "./bank";
import { addDays, todayKey } from "./dates";
import { readLocal } from "./images";
import { newPost, upsertPosts } from "./store";
import type { BankItem, Post, Project } from "./types";

/** Miniatura chica para la IA y qué tan clara es (0 oscura, 100 clara). */
async function thumbnail(item: BankItem) {
  const id = item.image ?? item.files.find((f) => f.type.startsWith("video/"))?.id;
  if (!id) return null;
  const blob = id.startsWith("/")
    ? await fetch(id).then((r) => (r.ok ? r.blob() : null))
    : await readLocal(id);
  if (!blob || !blob.type.startsWith("image/")) return null;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d")!;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let light = 0;
  for (let i = 0; i < data.length; i += 16) light += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  const brightness = Math.round((light / (data.length / 16) / 255) * 100);
  const image = canvas.toDataURL("image/jpeg", 0.75).split(",")[1];
  return { image, brightness };
}

/**
 * La IA ordena las fotos elegidas del banco en el feed, con fecha, hora y copy.
 * Las fotos se quedan en el banco, marcadas con la fecha que les tocó.
 */
export async function organizeInFeed(project: Project, items: BankItem[], posts: Post[]) {
  const prepared = (
    await Promise.all(
      items.map(async (item) => {
        const thumb = await thumbnail(item).catch(() => null);
        return thumb && {
          id: item.id,
          name: item.name,
          video: item.files.some((f) => f.type.startsWith("video/")),
          ...thumb,
        };
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => !!x);
  if (!prepared.length) throw new Error("No se pudieron leer las fotos elegidas.");

  const request: OrganizeRequest = {
    project: {
      name: project.name,
      instagram: project.instagram,
      pillars: project.pillars.map((p) => p.name),
      monthlyGoal: project.monthlyGoal,
    },
    start: addDays(todayKey(), 1),
    taken: [
      ...new Set(
        posts
          .filter((p) => p.project === project.slug && p.status !== "publicado" && p.date)
          .map((p) => p.date!),
      ),
    ].sort(),
    items: prepared,
  };

  const response = await fetch("/api/organizar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const result = (await response.json()) as Partial<OrganizePlan> & { error?: string };
  if (!response.ok || !result.posts) throw new Error(result.error ?? "No se pudo organizar.");

  const byId = new Map(items.map((item) => [item.id, item]));
  const pillars = new Set(project.pillars.map((p) => p.name));
  const created = result.posts.flatMap((plan) => {
    const item = byId.get(plan.id);
    if (!item) return [];
    return [
      {
        item,
        post: newPost(project.slug, {
          title: plan.title,
          caption: plan.caption,
          date: /^\d{4}-\d{2}-\d{2}$/.test(plan.date) ? plan.date : null,
          time: /^\d{2}:\d{2}$/.test(plan.time) ? plan.time : undefined,
          pillar: plan.pillar && pillars.has(plan.pillar) ? plan.pillar : null,
          format: plan.format,
          image: item.image,
          files: item.files,
        }),
      },
    ];
  });

  upsertPosts(created.map((c) => c.post));
  await markInFeed(created.map(({ item, post }) => ({ ...item, inFeed: { postId: post.id, date: post.date } })));
  return created.map((c) => c.post);
}
