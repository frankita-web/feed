"use client";

import { useRef, useState, type ReactNode } from "react";
import { shortDate, todayKey } from "@/lib/dates";
import { storeImage } from "@/lib/images";
import { addPosts, newPost, savePosts } from "@/lib/store";
import type { Post, Project } from "@/lib/types";
import { FeedTile, feedPosts } from "./FeedTile";
import { buttonClass, darkButtonClass } from "./Modal";
import { Orb } from "./Orb";
import { PostDialog } from "./PostDialog";

export function FeedView({ project, posts }: { project: Project; posts: Post[] }) {
  const [editing, setEditing] = useState<Post | null>(null);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const all = feedPosts(posts, project.slug);
  const today = todayKey();
  const isPlanned = (p: Post) => p.status !== "publicado";
  const plannedLabel = (p: Post) =>
    !p.date
      ? "Nuevo · sin fecha"
      : `${p.date < today ? "Atrasado" : "Nuevo"} · ${shortDate(p.date)}`;
  const published = all.filter((p) => !isPlanned(p));
  const plannedCount = all.length - published.length;
  const handle = project.instagram || project.name.toLowerCase();

  // Lo ya publicado entra sin fecha, en el orden elegido (la primera foto = la más reciente).
  const importPublished = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setUploading(list.length);
    const base = Date.now();
    const created: Post[] = [];
    for (const [i, file] of list.entries()) {
      created.push(
        newPost(project.slug, {
          image: await storeImage(file),
          status: "publicado",
          format: "Foto",
          title: file.name.replace(/\.[^.]+$/, ""),
          createdAt: base - i,
        }),
      );
      setUploading(list.length - i - 1);
    }
    addPosts(created);
  };

  // Reordenar: los posts nuevos intercambian fecha y orden; lo publicado queda fijo.
  const swap = (fromId: string, to: Post) => {
    const from = all.find((p) => p.id === fromId);
    if (!from || from.id === to.id || !isPlanned(from) || !isPlanned(to)) return;
    savePosts([
      { ...from, date: to.date, createdAt: to.createdAt },
      { ...to, date: from.date, createdAt: from.createdAt },
    ]);
  };

  const LIMIT = 18;
  const grid = (list: Post[], markPlanned: boolean) => (
    <>
      <div className="grid grid-cols-3 gap-[2px]">
        {(showAll ? list : list.slice(0, LIMIT)).map((post) => {
          const movable = markPlanned && isPlanned(post);
          return (
            <button
              key={post.id}
              onClick={() => setEditing(post)}
              draggable={movable}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", post.id);
                setMoving(post.id);
              }}
              onDragEnd={() => {
                setMoving(null);
                setTarget(null);
              }}
              onDragOver={(e) => {
                if (!movable || !moving) return;
                e.preventDefault();
                setTarget(post.id);
              }}
              onDragLeave={() => setTarget((t) => (t === post.id ? null : t))}
              onDrop={(e) => {
                e.preventDefault();
                setTarget(null);
                swap(e.dataTransfer.getData("text/plain"), post);
              }}
              className={`block transition ${movable ? "cursor-grab active:cursor-grabbing" : ""} ${
                moving === post.id ? "opacity-40" : ""
              } ${target === post.id && moving !== post.id ? "relative z-10 scale-[1.03] ring-2 ring-ink" : ""}`}
            >
              <FeedTile post={post} planned={movable ? plannedLabel(post) : undefined} />
            </button>
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
            importPublished(e.dataTransfer.files);
          }}
        >
          <ColumnHeader
            title="Feed actual"
            subtitle="Lo que ya está subido en Instagram"
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
              importPublished(e.target.files);
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
              grid(published, false)
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

        {/* Con lo nuevo: espacios para lo programado encima del feed actual */}
        <section>
          <ColumnHeader
            title="Con lo nuevo"
            subtitle={`Así se verá con ${plannedCount} ${plannedCount === 1 ? "post nuevo" : "posts nuevos"} · arrastra para reordenar`}
            action={<Legend />}
          />
          <Phone
            project={project}
            handle={handle}
            stats={`${published.length} publicaciones · +${plannedCount} nuevas`}
          >
            {all.length ? (
              grid(all, true)
            ) : (
              <p className="px-6 pb-12 text-center text-[13px] text-graphite">
                Agrega publicaciones en el calendario para verlas aquí.
              </p>
            )}
          </Phone>
          <p className="mt-3 text-center text-[12px] text-graphite">
            Las stories no aparecen en el grid · toca una publicación para editarla o subirle foto
          </p>
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
        <Orb project={project} className="h-16 w-16 shrink-0" />
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
