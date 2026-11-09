"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { shortDate, todayKey } from "@/lib/dates";
import { datesFollowOrder, outOfOrder, placeAt } from "@/lib/feed-order";
import { storeImage } from "@/lib/images";
import { rewriteCaptions } from "@/lib/organize";
import { feedPdf } from "@/lib/pdf";
import { postFromDeliverable, storeMedia } from "@/lib/media";
import { takeFromBank } from "@/lib/bank";
import {
  bankToFeed,
  feedToBank,
  linkDeliverableToPost,
  newPost,
  savePost,
  upsertPosts,
} from "@/lib/store";
import type { BankItem, Post, Project, Shoot } from "@/lib/types";
import { BankPanel } from "./BankPanel";
import { ShootTray } from "./ShootTray";
import { FeedTile, feedPosts } from "./FeedTile";
import { buttonClass, darkButtonClass } from "./Modal";
import { Logo } from "./Logo";
import { PdfButton } from "./PdfButton";
import { PostDialog } from "./PostDialog";

export function FeedView({
  project,
  posts,
  shoots = [],
  bank = [],
}: {
  project: Project;
  posts: Post[];
  shoots?: Shoot[];
  bank?: BankItem[];
}) {
  const [editing, setEditing] = useState<Post | null>(null);
  const [uploading, setUploading] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [planDrop, setPlanDrop] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [rewriteNote, setRewriteNote] = useState<string | null>(null);
  const planRef = useRef<HTMLInputElement>(null);

  const all = feedPosts(posts, project.slug);
  const today = todayKey();
  const isPlanned = (p: Post) => p.status !== "publicado";
  const plannedLabel = (p: Post) =>
    !p.date
      ? "Nuevo · sin fecha"
      : `${p.date < today ? "" : "Nuevo · "}${shortDate(p.date)}${mismatched.has(p.id) ? " ⚠" : ""}`;
  const published = all.filter((p) => !isPlanned(p));
  const plannedCount = all.length - published.length;
  const handle = project.instagram || project.name.toLowerCase();

  // Lo nuevo que no calza con su fecha de publicación (en Instagram lo más nuevo queda arriba).
  const planned = all.filter((p) => isPlanned(p) && !p.pinned);
  const mismatched = outOfOrder(planned);

  // Lo publicado es fijo: solo "Con lo nuevo" se acomoda. Lo subido entra arriba del feed actual.
  type Column = "actual" | "nuevo";
  const listOf = (column: Column) => (column === "actual" ? published : planned);

  /** Posts (nuevos o movidos) puestos justo antes de `before`, o arriba de todo. */
  const positioned = (moved: Post[], column: Column, before?: Post) => {
    const ids = new Set(moved.map((p) => p.id));
    const rest = listOf(column).filter((p) => !ids.has(p.id) && !p.pinned);
    const at = before && !ids.has(before.id) ? Math.max(0, rest.indexOf(before)) : 0;
    return placeAt(rest, moved, at);
  };
  const place = (moved: Post[], column: Column, before?: Post) =>
    upsertPosts(positioned(moved, column, before));

  /** Una foto del banco pasa al feed planeado. */
  const fromBank = (item: BankItem, before?: Post) => {
    const post = newPost(project.slug, {
      title: item.name,
      image: item.image,
      files: item.files,
      format: item.files.some((f) => f.type.startsWith("video/")) ? "Reel vertical" : "Foto",
    });
    bankToFeed(item.id, positioned([post], "nuevo", before));
    takeFromBank(item.id);
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
    if (column === "actual") return; // lo publicado no se mueve
    if (data.startsWith("bank:")) {
      const item = bank.find((b) => b.id === data.slice(5));
      if (item) fromBank(item, before);
      return;
    }
    if (data.startsWith("deliverable:")) {
      const [, shootId, itemId] = data.split(":");
      const item = shoots.find((s) => s.id === shootId)?.items.find((i) => i.id === itemId);
      if (!item) return;
      const post = postFromDeliverable(project.slug, item);
      place([post], "nuevo", before);
      linkDeliverableToPost(shootId, itemId, post.id);
      return;
    }
    const from = planned.find((p) => p.id === data);
    if (from && from.id !== before?.id) place([from], "nuevo", before);
  };

  const remove = (post: Post) => {
    if (
      confirm(
        `¿Sacar "${post.title || "esta foto"}" del feed? Se borra del calendario y la foto vuelve al banco.`,
      )
    )
      feedToBank(post);
  };

  const LIMIT = 18;
  const grid = (list: Post[], column: Column) => (
    <>
      <div className="grid grid-cols-3 gap-[2px]">
        {(showAll ? list : list.slice(0, LIMIT)).map((post) => {
          // Solo lo nuevo, en "Con lo nuevo", se mueve y se edita.
          const movable = column === "nuevo" && isPlanned(post) && !post.pinned;
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
                    savePost({ ...post, pinned: !post.pinned });
                  }}
                  className="h-7 rounded-full bg-white/95 px-2.5 text-[11px] font-medium shadow"
                  title="Las fijadas van primero en el feed"
                >
                  {post.pinned ? "Desfijar" : "Fijar"}
                </button>
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
                {movable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(post);
                    }}
                    className="h-7 w-7 rounded-full bg-white/95 text-[13px] shadow"
                    aria-label="Sacar del feed"
                    title="Sacar del feed (vuelve al banco)"
                  >
                    ×
                  </button>
                )}
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
      <BankPanel project={project} bank={bank} posts={posts} onUse={(item) => fromBank(item)} />
      <ShootTray project={project} posts={posts} shoots={shoots} />
      <div className="mx-auto max-w-xl">
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
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    const targets = all.filter(isPlanned);
                    if (
                      !targets.length ||
                      !confirm(
                        `Se reescriben los copys de los ${targets.length} posts nuevos con el tono de ${project.name}. Los copys actuales se reemplazan. ¿Seguir?`,
                      )
                    )
                      return;
                    setRewriting(true);
                    setRewriteNote(null);
                    try {
                      const done = await rewriteCaptions(project, targets);
                      setRewriteNote(`Listo: ${done} copys nuevos. Revísalos en cada ficha.`);
                    } catch (error) {
                      setRewriteNote((error as Error).message);
                    }
                    setRewriting(false);
                  }}
                  disabled={rewriting || !plannedCount}
                  className={buttonClass}
                  title="La IA reescribe los copys de lo nuevo con el tono del cliente"
                >
                  {rewriting ? "Escribiendo…" : "✨ Rehacer copys"}
                </button>
                <PdfButton make={() => feedPdf(project, posts)} />
                <button
                  onClick={() => planRef.current?.click()}
                  disabled={uploading > 0}
                  className={darkButtonClass}
                >
                  {uploading ? `Subiendo… (${uploading})` : "+ Agregar fotos"}
                </button>
              </div>
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
          {rewriteNote && (
            <p className="mt-3 rounded-2xl bg-white/70 px-4 py-2.5 text-[12px]">{rewriteNote}</p>
          )}
          {mismatched.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/70 px-4 py-2.5 text-[12px]">
              <span>
                ⚠ {mismatched.size} {mismatched.size === 1 ? "post no calza" : "posts no calzan"}{" "}
                con su fecha: en Instagram lo más nuevo queda arriba.
              </span>
              <span className="flex flex-wrap gap-3">
                <button
                  onClick={() =>
                    upsertPosts(planned.map((p) => (p.date ? { ...p, order: undefined } : p)))
                  }
                  className="font-medium underline"
                >
                  Ordenar por fecha
                </button>
                <button
                  onClick={() =>
                    confirm(
                      "Las fechas de los posts nuevos se van a reordenar según cómo los acomodaste. ¿Seguir?",
                    ) && upsertPosts(datesFollowOrder(planned))
                  }
                  className="underline"
                >
                  Ajustar fechas al orden
                </button>
              </span>
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

