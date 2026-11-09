"use client";

import type { CopysRequest, CopysResult } from "@/app/api/copys/route";
import type { OrganizePlan, OrganizeRequest } from "@/app/api/organizar/route";
import { markInFeed } from "./bank";
import { addDays, todayKey } from "./dates";
import { readLocal } from "./images";
import { newPost, upsertPosts } from "./store";
import type { BankItem, Post, Project } from "./types";

/** Miniatura chica para la IA y qué tan clara es (0 oscura, 100 clara). */
async function thumbnail(item: Pick<BankItem, "image" | "files">) {
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
      voice: project.voice,
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
  const answer = (await response.json()) as Partial<OrganizePlan> & { error?: string };
  // Sin IA activada se ordena igual (claras y oscuras alternadas, con fechas), sin copy.
  const withoutAi = !response.ok && !!answer.error?.includes("no está activada");
  if (!withoutAi && (!response.ok || !answer.posts))
    throw new Error(answer.error ?? "No se pudo organizar.");
  const result = withoutAi ? simplePlan(request) : (answer as OrganizePlan);

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
  return { posts: created.map((c) => c.post), withoutAi };
}

/** La IA reescribe los copys de estos posts con el tono del cliente (de a 8, para no pedir de más). */
export async function rewriteCaptions(project: Project, posts: Post[]) {
  let done = 0;
  for (let i = 0; i < posts.length; i += 8) {
    const group = posts.slice(i, i + 8);
    const request: CopysRequest = {
      project: { name: project.name, instagram: project.instagram, voice: project.voice },
      posts: await Promise.all(
        group.map(async (post) => ({
          id: post.id,
          title: post.title,
          format: post.format,
          date: post.date,
          pillar: post.pillar,
          caption: post.caption,
          image: (await thumbnail({ image: post.image, files: post.files ?? [] }).catch(() => null))
            ?.image,
        })),
      ),
    };
    const response = await fetch("/api/copys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const result = (await response.json()) as Partial<CopysResult> & { error?: string };
    if (!response.ok || !result.captions) throw new Error(result.error ?? "No se pudieron rehacer los copys.");
    const byId = new Map(result.captions.map((c) => [c.id, c.caption]));
    const changed = group.flatMap((post) => {
      const caption = byId.get(post.id);
      return caption ? [{ ...post, caption }] : [];
    });
    upsertPosts(changed);
    done += changed.length;
  }
  return done;
}

/** Orden sin IA: alterna oscuras y claras y reparte las fechas según la meta del mes. */
function simplePlan({ project, start, taken, items }: OrganizeRequest): OrganizePlan {
  const sorted = [...items].sort((a, b) => a.brightness - b.brightness);
  const alternated: typeof items = [];
  while (sorted.length) {
    alternated.push(sorted.shift()!);
    if (sorted.length) alternated.push(sorted.pop()!);
  }
  const every = Math.max(1, Math.round(30 / Math.max(1, project.monthlyGoal)));
  const busy = new Set(taken);
  let day = start;
  return {
    posts: alternated.map((item) => {
      while (busy.has(day)) day = addDays(day, 1);
      const date = day;
      busy.add(date);
      day = addDays(day, every);
      return {
        id: item.id,
        date,
        time: "13:00",
        title: item.name,
        caption: "",
        pillar: null,
        format: item.video ? ("Reel vertical" as const) : ("Foto" as const),
      };
    }),
  };
}
