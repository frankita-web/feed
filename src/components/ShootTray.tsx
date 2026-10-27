"use client";

import Link from "next/link";
import { useState } from "react";
import { shortDate } from "@/lib/dates";
import { useImageUrl } from "@/lib/images";
import { postFromDeliverable } from "@/lib/media";
import { updateDeliverable } from "@/lib/store";
import type { Deliverable, Post, Project, Shoot } from "@/lib/types";
import { PostDialog } from "./PostDialog";

type Sending = { shoot: Shoot; item: Deliverable; post: Post };

/**
 * Bandeja arriba del feed: el material entregado que todavía no está en el feed,
 * un "slide" por shoot. "Usar" abre la ficha ya armada para ponerle fecha.
 */
export function ShootTray({
  project,
  posts,
  shoots,
}: {
  project: Project;
  posts: Post[];
  shoots: Shoot[];
}) {
  const [sending, setSending] = useState<Sending | null>(null);
  const inFeed = new Set(posts.map((p) => p.id));
  const slides = shoots
    .filter((s) => s.project === project.slug)
    .map((shoot) => ({
      shoot,
      ready: shoot.items.filter(
        (i) => i.status === "entregado" && !(i.postId && inFeed.has(i.postId)),
      ),
      pending: shoot.items.filter((i) => i.status === "pendiente").length,
    }))
    .filter((s) => s.ready.length || s.pending)
    .sort((a, b) => ((a.shoot.date ?? "") < (b.shoot.date ?? "") ? 1 : -1));

  if (!slides.length) return null;

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl leading-none font-semibold tracking-[-0.04em]">
            Material de shoots
          </h2>
          <p className="mt-1 text-[13px] text-graphite">
            Lo que ya te entregaron y falta poner en el feed
          </p>
        </div>
        <Link
          href={`/proyecto/${project.slug}/entregables`}
          className="text-[13px] text-graphite hover:text-ink"
        >
          Ver entregables →
        </Link>
      </div>

      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {slides.map(({ shoot, ready, pending }) => (
          <div
            key={shoot.id}
            className="silver w-[min(88vw,520px)] shrink-0 snap-start rounded-[24px] p-4"
          >
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                {shoot.title || "Shoot"}
              </p>
              <p className="shrink-0 text-[12px] text-graphite">
                {shoot.date && shortDate(shoot.date)}
                {shoot.crew && ` · ${shoot.crew}`}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ready.map((item) => (
                <TrayItem
                  key={item.id}
                  item={item}
                  onUse={() =>
                    setSending({ shoot, item, post: postFromDeliverable(project.slug, item) })
                  }
                />
              ))}
              {Array.from({ length: pending }, (_, i) => (
                <div
                  key={`p${i}`}
                  className="flex aspect-[3/4] items-center justify-center rounded-xl border-[1.5px] border-dashed border-ink/25 p-1 text-center text-[10px] text-graphite"
                >
                  Falta que lo entreguen
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {sending && (
        <PostDialog
          key={sending.post.id}
          project={project}
          post={sending.post}
          isNew
          onClose={() => setSending(null)}
          onSaved={(post) =>
            updateDeliverable(sending.shoot.id, sending.item.id, (i) => ({ ...i, postId: post.id }))
          }
        />
      )}
    </section>
  );
}

function TrayItem({ item, onUse }: { item: Deliverable; onUse: () => void }) {
  const cover = useImageUrl(item.cover);
  return (
    <button
      onClick={onUse}
      className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-[#dedede] text-left"
      title={`Poner "${item.title}" en el feed`}
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element -- archivo local
        <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-6 pb-1.5 text-[11px] font-medium text-white">
        {item.title}
      </span>
      <span className="absolute top-1.5 right-1.5 rounded-full bg-white/90 px-1.5 text-[10px] font-medium opacity-0 transition group-hover:opacity-100">
        Usar +
      </span>
    </button>
  );
}
