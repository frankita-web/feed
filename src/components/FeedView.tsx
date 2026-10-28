"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { shortDate, todayKey } from "@/lib/dates";
import { datesFollowOrder, outOfOrder, placeAt } from "@/lib/feed-order";
import { storeImage } from "@/lib/images";
import { postFromDeliverable, storeMedia } from "@/lib/media";
import { deletePost, linkDeliverableToPost, newPost, upsertPosts } from "@/lib/store";
import type { Post, Project, Shoot } from "@/lib/types";
import { ShootTray } from "./ShootTray";
import { FeedTile, feedPosts } from "./FeedTile";
import { buttonClass, darkButtonClass } from "./Modal";
import { Logo } from "./Logo";
import { PostDialog } from "./PostDialog";

export function FeedView({
  project,
  posts,
  shoots = [],
}: {
  project: Project;
  posts: Post[];
  shoots?: Shoot[];
}) {
  const [editing, setEditing] = useState<Post | null>(null);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [planDrop, setPlanDrop] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const planRef = useRef<HTMLInputElement>(null);

  const all = feedPosts(posts, project.slug);
  const today = todayKey();
  const isPlanned = (p: Post) => p.status !== "publicado";
  const plannedLabel = (p: Post) =>
    !p.date
      ? "Nuevo · sin fecha"
      : `${p.date < today ? "Atrasado" : "Nuevo"} · ${shortDate(p.date)}${mismatched.has(p.id) ? " ⚠" : ""}`;
  const published = all.filter((p) => !isPlanned(p));
  const plannedCount = all.length - published.length;
  const handle = project.instagram || project.name.toLowerCase();

  // Lo nuevo que no calza con su fecha de publicación (en Instagram lo más nuevo queda arriba).
  const planned = all.filter((p) => isPlanned(p) && !p.pinned);
  const mismatched = outOfOrder(planned);

  type Column = "actual" | "nuevo";
  const listOf = (column: Column) =>
    (column === "actual" ? published : all).filter((p) => !p.pinned);

  /** Pone posts (nuevos o movidos) justo antes de `before`, o arriba de todo. */
  const place = (moved: Post[], column: Column, before?: Post) => {
    const ids = new Set(moved.map((p) => p.id));
    const rest = listOf(column).filter((p) => !ids.has(p.id));
    const at = before && !ids.has(before.id) ? Math.max(0, rest.indexOf(before)) : 0;
    upsertPosts(placeAt(rest, moved, at));
  };

  /** Fotos o videos desde la compu: un post por archivo, en el lugar donde se soltaron. */
  const addFiles = async (files: FileList | File[], column: Column, before?: Post) => {
    const list = Array.from(files).filter((f) => /^(image|video)\//.test(f.type));
    if (!list.length) return;
    setUploading(list.length);
    const created: Post[] = [];
    for (const file of list) {
      const media = await storeMedia([file], false).catch(() => null);
      if (!media) {
        alert(`No se pudo guardar "${file.name}" en este navegador.`);
        setUploading((n) => n - 1);
        continue;
      }
      created.push(
        newPost(project.slug, {
          title: file.name.replace(/\.[^.]+$/, ""),
          format: file.type.startsWith("video/") ? "Reel vertical" : "Foto",
          status: column === "actual" ? "publicado" : "pendiente",
          image: media.cover,
          files: media.files,
        }),
      );
      setUploading((n) => n - 1);
    }
    if (created.length) place(created, column, before);
  };

  /** Soltar algo en el feed: archivos, material de un shoot o una foto que se mueve. */
  const dropOn = async (e: DragEvent, column: Column, before?: Post) => {
    e.preventDefault();
    e.stopPropagation();
    setTarget(null);
    setPlanDrop(false);
    setDragging(false);
    setMoving(null);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) {
      // Una foto sobre un espacio sin foto: se vuelve su portada.
      if (before && !before.image && files.length === 1 && files[0].type.startsWith("image/")) {
        upsertPosts([{ ...before, image: await storeImage(files[0]) }]);
        return;
      }
      return addFiles(files, column, before);
    }
    const data = e.dataTransfer.getData("text/plain");
    if (data.startsWith("deliverable:")) {
      const [, shootId, itemId] = data.split(":");
      const item = shoots.find((s) => s.id === shootId)?.items.find((i) => i.id === itemId);
      if (!item) return;
      const post = postFromDeliverable(project.slug, item);
      place([post], "nuevo", column === "nuevo" ? before : undefined);
      linkDeliverableToPost(shootId, itemId, post.id);
      return;
    }
    const from = all.find((p) => p.id === data);
    if (from && !from.pinned && from.id !== before?.id) place([from], column, before);
  };

  const remove = (post: Post) => {
    if (
      confirm(`¿Quitar "${post.title || "esta foto"}" del feed? También se borra del calendario.`)
    )
      deletePost(post.id);
  };

  const LIMIT = 18;
  const grid = (list: Post[], column: Column) => (
    <>
      <div className="grid grid-cols-3 gap-[2px]">
        {(showAll ? list : list.slice(0, LIMIT)).map((post) => {
          const movable = !post.pinned;
          const isNew = column === "nuevo" && isPlanned(post);
          return (
            <div
              key={post.id}
              role="button"
              tabIndex={0}
              onClick={() => setEditing(post)}
              onKeyDown={(e) => e.key === "Enter" && setEditing(post)}
              draggable={movable}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", post.id);
                e.dataTransfer.effectAllowed = "move";
                setMoving(post.id);
              }}
              onDragEnd={() => {
                setMoving(null);
                setTarget(null);
              }}
              onDragOver={(e) => {
                if (!movable) return;
                e.preventDefault();
                setTarget(post.id);
              }}
              onDragLeave={() => setTarget((t) => (t === post.id ? null : t))}
              onDrop={(e) => movable && dropOn(e, column, post)}
              className={`group relative block outline-none ${movable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${
                moving === post.id ? "opacity-40" : ""
              } ${target === post.id && moving !== post.id ? "z-10 shadow-[inset_4px_0_0_0_#161616] brightness-95" : ""}`}
            >
              <FeedTile post={post} planned={isNew ? plannedLabel(post) : undefined} />
              <div className="absolute right-1.5 bottom-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(post);
                  }}
                  className="h-7 rounded-full bg-white/95 px-2.5 text-[11px] font-medium shadow"
                  title="Editar: foto, fecha, copy…"
                >
                  ✎ Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(post);
                  }}
                  className="h-7 w-7 rounded-full bg-white/95 text-[13px] shadow"
                  aria-label="Quitar del feed"
                  title="Quitar del feed"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {list.length > LIMIT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full py-4 text-[13px] text-graphite hover:text-ink"
        >
          {showAll ? "Ver menos" : `Ver todo (${list.length})`}
        </button>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-8">
      <ShootTray project={project} posts={posts} shoots={shoots} />
      <div className="grid items-start gap-10 lg:grid-cols-2">
        {/* Feed actual: solo lo ya subido */}
        <section
          onDragOver={(e) => {
            // Solo fotos desde la compu, no posts que se están reordenando
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            dropOn(e, "actual");
          }}
        >
          <ColumnHeader
            title="Feed actual"
            subtitle="Lo que ya está subido · arrastra para corregir el orden"
            action={
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading > 0}
                className={buttonClass}
              >
                {uploading ? `Subiendo… (${uploading})` : "+ Agregar fotos"}
              </button>
            }
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files, "actual");
              e.target.value = "";
            }}
          />
          <Phone
            project={project}
            handle={handle}
            stats={`${published.length} publicaciones`}
            highlight={dragging}
          >
            {published.length ? (
              grid(published, "actual")
            ) : (
              <EmptyFeed handle={project.instagram} onUpload={() => fileRef.current?.click()} />
            )}
          </Phone>
          {published.length > 0 && (
            <p className="mt-3 text-center text-[12px] text-graphite">
              Arrastra aquí más fotos de tu feed (la primera = la más reciente)
            </p>
          )}
        </section>

        {/* Con lo nuevo: aquí se arma el feed que viene */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setPlanDrop(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setPlanDrop(false);
          }}
          onDrop={(e) => dropOn(e, "nuevo")}
        >
          <ColumnHeader
            title="Con lo nuevo"
            subtitle={`${plannedCount} ${plannedCount === 1 ? "post nuevo" : "posts nuevos"} · arrastra para acomodar`}
            action={
              <button
                onClick={() => planRef.current?.click()}
                disabled={uploading > 0}
                className={darkButtonClass}
              >
                {uploading ? `Subiendo… (${uploading})` : "+ Agregar fotos"}
              </button>
            }
          />
          <input
            ref={planRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files, "nuevo");
              e.target.value = "";
            }}
          />
          <Phone
            project={project}
            handle={handle}
            stats={`${published.length} publicaciones · +${plannedCount} nuevas`}
            highlight={planDrop}
          >
            {all.length ? (
              grid(all, "nuevo")
            ) : (
              <p className="px-6 pb-12 text-center text-[13px] text-graphite">
                Arrastra fotos aquí o usa “+ Agregar fotos”.
              </p>
            )}
          </Phone>
          {mismatched.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/70 px-4 py-2.5 text-[12px]">
              <span>
                ⚠ {mismatched.size} {mismatched.size === 1 ? "post no calza" : "posts no calzan"}{" "}
                con su fecha: en Instagram lo más nuevo queda arriba.
              </span>
              <button
                onClick={() =>
                  confirm(
                    "Las fechas de los posts nuevos se van a reordenar según cómo los acomodaste. ¿Seguir?",
                  ) && upsertPosts(datesFollowOrder(planned))
                }
                className="font-medium underline"
              >
                Ajustar fechas al orden
              </button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-graphite">
            <Legend />
            <span>
              Arrastra fotos desde tu compu o desde “Material de shoots” · suelta sobre un post para
              ponerla ahí
            </span>
          </div>
        </section>
      </div>

      {editing && (
        <PostDialog
          key={editing.id}
          project={project}
          post={editing}
          isNew={false}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ColumnHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl leading-none font-semibold tracking-[-0.04em]">{title}</h2>
        <p className="mt-1 text-[13px] text-graphite">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[12px]">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 bg-[#dedede]" /> Ya subido
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 border-[1.5px] border-dashed border-ink/70 bg-white" /> Nuevo
      </span>
    </div>
  );
}

function Phone({
  project,
  handle,
  stats,
  highlight,
  children,
}: {
  project: Project;
  handle: string;
  stats: string;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`silver overflow-hidden rounded-[32px] transition ${highlight ? "ring-2 ring-ink ring-offset-4 ring-offset-paper" : ""}`}
    >
      <div className="flex items-center gap-4 px-5 pt-6 pb-4">
        <Logo project={project} className="h-16 w-16 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-[-0.03em]">{handle}</p>
          <p className="text-[12px] text-graphite">{stats}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyFeed({ handle, onUpload }: { handle: string; onUpload: () => void }) {
  return (
    <div className="mx-5 mb-6 flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-ink/25 px-6 py-12 text-center">
      <p className="text-[15px] font-semibold tracking-[-0.02em]">Trae tu feed de Instagram</p>
      <p className="max-w-xs text-[13px] text-graphite">
        Instagram no deja leer las fotos automáticamente. Guarda las imágenes de tus últimos posts y
        arrástralas aquí (la primera = la más reciente).
      </p>
      <div className="mt-1 flex gap-2">
        <button onClick={onUpload} className={darkButtonClass}>
          Elegir fotos
        </button>
        {handle && (
          <a
            href={`https://www.instagram.com/${handle}/`}
            target="_blank"
            rel="noreferrer"
            className={buttonClass}
          >
            Abrir @{handle} ↗
          </a>
        )}
      </div>
    </div>
  );
}
