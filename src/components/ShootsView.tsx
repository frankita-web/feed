"use client";

import { useRef, useState } from "react";
import { shortDate, todayKey } from "@/lib/dates";
import { useImageUrl } from "@/lib/images";
import { postFromDeliverable, storeMedia } from "@/lib/media";
import { deleteShoot, newDeliverable, newShoot, saveShoot, updateDeliverable } from "@/lib/store";
import {
  DELIVERABLE_KINDS,
  type Deliverable,
  type Post,
  type Project,
  type Shoot,
} from "@/lib/types";
import { buttonClass, darkButtonClass, inputClass } from "./Modal";
import { PostDialog } from "./PostDialog";

type Sending = { shoot: Shoot; item: Deliverable; post: Post; isNew: boolean };

/** Entregables: cada shoot con lo que se grabó, qué falta que entreguen y qué ya está en el feed. */
export function ShootsView({
  project,
  posts,
  shoots,
}: {
  project: Project;
  posts: Post[];
  shoots: Shoot[];
}) {
  const [sending, setSending] = useState<Sending | null>(null);
  const mine = shoots
    .filter((s) => s.project === project.slug)
    .sort((a, b) => ((a.date ?? "") < (b.date ?? "") ? 1 : -1));
  const items = mine.flatMap((s) => s.items);
  const pending = items.filter((i) => i.status === "pendiente").length;
  const ready = items.filter((i) => i.status === "entregado" && !i.postId).length;
  const used = items.filter((i) => i.postId).length;

  const create = () =>
    saveShoot(
      newShoot(project.slug, {
        title: "Shoot",
        date: todayKey(),
        items: [1, 2, 3].map((n) => newDeliverable({ title: `Video ${n}` })),
      }),
    );

  // Mandar al feed: abre la ficha ya armada; si ya está en el feed, abre ese post.
  const toFeed = (shoot: Shoot, item: Deliverable) => {
    const existing = posts.find((p) => p.id === item.postId);
    setSending({
      shoot,
      item,
      post: existing ?? postFromDeliverable(project.slug, item),
      isNew: !existing,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 text-[13px]">
          <Stat value={pending} label="faltan por entregar" strong={pending > 0} />
          <Stat value={ready} label="listos para el feed" />
          <Stat value={used} label="ya en el feed" />
        </div>
        <button onClick={create} className={darkButtonClass}>
          + Nuevo shoot
        </button>
      </div>

      {mine.length ? (
        <div className="space-y-6">
          {mine.map((shoot) => (
            <ShootCard
              key={shoot.id}
              shoot={shoot}
              posts={posts}
              onToFeed={(item) => toFeed(shoot, item)}
            />
          ))}
        </div>
      ) : (
        <div className="silver flex flex-col items-center gap-3 rounded-[24px] p-12 text-center">
          <p className="text-xl font-semibold tracking-[-0.03em]">Todavía no hay shoots</p>
          <p className="max-w-md text-[13px] text-graphite">
            Anota cada shoot con lo que se grabó y quién lo hizo. Así ves qué falta que te entreguen
            y, cuando llegue, lo mandas directo al feed.
          </p>
          <button onClick={create} className={darkButtonClass}>
            + Nuevo shoot
          </button>
        </div>
      )}

      {sending && (
        <PostDialog
          key={sending.post.id}
          project={project}
          post={sending.post}
          isNew={sending.isNew}
          onClose={() => setSending(null)}
          onSaved={(post) =>
            updateDeliverable(sending.shoot.id, sending.item.id, (i) => ({ ...i, postId: post.id }))
          }
        />
      )}
    </div>
  );
}

function Stat({ value, label, strong }: { value: number; label: string; strong?: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 ${
        strong ? "bg-ink text-white" : "border border-black/10 bg-white/60"
      }`}
    >
      <b className="font-semibold">{value}</b> {label}
    </span>
  );
}

function ShootCard({
  shoot,
  posts,
  onToFeed,
}: {
  shoot: Shoot;
  posts: Post[];
  onToFeed: (item: Deliverable) => void;
}) {
  const set = (fields: Partial<Shoot>) => saveShoot({ ...shoot, ...fields });
  const pending = shoot.items.filter((i) => i.status === "pendiente").length;
  const late = pending > 0 && !!shoot.due && shoot.due < todayKey();

  return (
    <section className="silver rounded-[24px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <input
          className="min-w-48 flex-1 bg-transparent text-2xl font-semibold tracking-[-0.03em] outline-none placeholder:text-graphite/50"
          value={shoot.title}
          placeholder="Nombre del shoot"
          onChange={(e) => set({ title: e.target.value })}
        />
        <span
          className={`self-center rounded-full px-3 py-1 text-[12px] ${
            late
              ? "bg-ink text-white"
              : pending
                ? "border border-black/15"
                : "border border-black/10 text-graphite"
          }`}
        >
          {pending
            ? `${late ? "Atrasado · " : ""}faltan ${pending} de ${shoot.items.length}`
            : shoot.items.length
              ? "Todo entregado ✓"
              : "Sin entregables"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)_150px]">
        <label className="text-[11px] font-medium tracking-[0.08em] text-graphite uppercase">
          Día del shoot
          <input
            type="date"
            className={`${inputClass} mt-1 normal-case`}
            value={shoot.date ?? ""}
            onChange={(e) => set({ date: e.target.value || null })}
          />
        </label>
        <label className="text-[11px] font-medium tracking-[0.08em] text-graphite uppercase">
          Fotógrafo / videógrafo
          <input
            className={`${inputClass} mt-1 normal-case`}
            value={shoot.crew}
            placeholder="Ej. Josemi · @carlocanun"
            onChange={(e) => set({ crew: e.target.value })}
          />
        </label>
        <label className="text-[11px] font-medium tracking-[0.08em] text-graphite uppercase">
          Entregan el
          <input
            type="date"
            className={`${inputClass} mt-1 normal-case`}
            value={shoot.due ?? ""}
            onChange={(e) => set({ due: e.target.value || null })}
          />
        </label>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {shoot.items.map((item) => (
          <DeliverableTile
            key={item.id}
            shoot={shoot}
            item={item}
            post={posts.find((p) => p.id === item.postId)}
            onToFeed={() => onToFeed(item)}
          />
        ))}
        <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-black/15 p-3">
          <span className="text-[12px] text-graphite">Agregar</span>
          {(["Video", "Fotos", "Carrusel"] as const).map((kind) => (
            <button
              key={kind}
              onClick={() =>
                set({
                  items: [
                    ...shoot.items,
                    newDeliverable({
                      kind,
                      title: `${kind} ${shoot.items.filter((i) => i.kind === kind).length + 1}`,
                    }),
                  ],
                })
              }
              className={`${buttonClass} w-full py-1 text-[12px]`}
            >
              + {kind}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <textarea
          rows={1}
          className={`${inputClass} min-w-60 flex-1 text-[13px]`}
          value={shoot.notes}
          placeholder="Notas: qué se grabó, links de la carpeta, pendientes…"
          onChange={(e) => set({ notes: e.target.value })}
        />
        <button
          onClick={() =>
            confirm(`¿Borrar el shoot "${shoot.title}"? Los posts del feed no se borran.`) &&
            deleteShoot(shoot.id)
          }
          className="text-[12px] text-graphite hover:text-ink hover:underline"
        >
          Borrar shoot
        </button>
      </div>
    </section>
  );
}

function DeliverableTile({
  shoot,
  item,
  post,
  onToFeed,
}: {
  shoot: Shoot;
  item: Deliverable;
  post?: Post;
  onToFeed: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const cover = useImageUrl(item.cover);
  const video = item.files.find((f) => f.type.startsWith("video/"));
  const videoUrl = useImageUrl(video?.id ?? null);
  const change = (fields: Partial<Deliverable>) =>
    updateDeliverable(shoot.id, item.id, (i) => ({ ...i, ...fields }));

  const upload = async (list: File[]) => {
    if (!list.length) return;
    setUploading(true);
    const media = await storeMedia(list, !!item.cover);
    updateDeliverable(shoot.id, item.id, (i) => ({
      ...i,
      cover: i.cover ?? media.cover,
      slides: [...i.slides, ...media.slides],
      files: [...i.files, ...media.files],
      status: "entregado",
    }));
    setUploading(false);
  };

  const delivered = item.status === "entregado";

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(Array.from(e.dataTransfer.files));
        }}
        className={`group relative aspect-[3/4] overflow-hidden rounded-2xl ${
          delivered ? "bg-[#dedede]" : "border-[1.5px] border-dashed border-ink/40 bg-white/60"
        }`}
      >
        {videoUrl ? (
          <video
            src={videoUrl}
            poster={cover ?? undefined}
            muted
            loop
            playsInline
            preload="metadata"
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => e.currentTarget.pause()}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- archivo local
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-center text-[12px] text-graphite hover:text-ink"
          >
            <span className="text-xl">{uploading ? "…" : "+"}</span>
            {uploading ? "Subiendo…" : "Falta que lo entreguen · arrastra aquí el archivo"}
          </button>
        )}
        <span
          className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            post ? "bg-ink text-white" : delivered ? "bg-white/90" : "bg-white/90 text-graphite"
          }`}
        >
          {post
            ? `En el feed${post.date ? ` · ${shortDate(post.date)}` : ""}`
            : delivered
              ? "Entregado"
              : "Pendiente"}
        </span>
        {item.slides.length + (item.cover ? 1 : 0) > 1 && (
          <span className="absolute top-2 right-2 rounded-full bg-ink/70 px-1.5 text-[10px] text-white">
            {item.slides.length + 1} fotos
          </span>
        )}
        {(cover || videoUrl) && (
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute right-2 bottom-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] opacity-0 transition group-hover:opacity-100"
          >
            + archivos
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            upload(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      <input
        className="w-full bg-transparent text-[13px] font-medium outline-none"
        value={item.title}
        onChange={(e) => change({ title: e.target.value })}
        aria-label="Nombre del entregable"
      />
      <div className="flex items-center gap-1.5">
        <select
          value={item.kind}
          onChange={(e) => change({ kind: e.target.value as Deliverable["kind"] })}
          className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white/70 px-1.5 py-1 text-[11px]"
          aria-label="Tipo"
        >
          {DELIVERABLE_KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <button
          onClick={() => change({ status: delivered ? "pendiente" : "entregado" })}
          className="rounded-lg border border-black/10 bg-white/70 px-1.5 py-1 text-[11px]"
          title="Marcar como entregado o pendiente"
        >
          {delivered ? "✓" : "○"}
        </button>
        <button
          onClick={() =>
            confirm(`¿Quitar "${item.title}"?`) &&
            saveShoot({ ...shoot, items: shoot.items.filter((i) => i.id !== item.id) })
          }
          className="px-1 text-[13px] text-graphite hover:text-ink"
          aria-label="Quitar entregable"
        >
          ×
        </button>
      </div>
      <button
        onClick={onToFeed}
        disabled={!delivered}
        className={`${post ? buttonClass : darkButtonClass} py-1 text-[12px] disabled:opacity-30`}
        title={delivered ? "" : "Primero sube el archivo o márcalo como entregado"}
      >
        {post ? "Ver en el feed" : "Al feed →"}
      </button>
    </div>
  );
}
