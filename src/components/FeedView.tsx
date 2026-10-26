"use client";

import { useRef, useState, type CSSProperties } from "react";
import { shortDate, todayKey } from "@/lib/dates";
import { storeImage } from "@/lib/images";
import { addPosts, newPost } from "@/lib/store";
import type { Post, Project } from "@/lib/types";
import { FeedTile, feedPosts } from "./FeedTile";
import { PostDialog } from "./PostDialog";

export function FeedView({ project, posts }: { project: Project; posts: Post[] }) {
  const [showPlanned, setShowPlanned] = useState(true);
  const [editing, setEditing] = useState<Post | null>(null);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const today = todayKey();
  const all = feedPosts(posts, project.slug);
  const isPlanned = (p: Post) => p.status !== "publicado" && (!p.date || p.date >= today);
  const visible = showPlanned ? all : all.filter((p) => !isPlanned(p));
  const plannedCount = all.filter(isPlanned).length;

  // Lo ya publicado entra sin fecha, en el orden elegido (la primera foto = la más reciente).
  const importPublished = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={showPlanned}
              onChange={(e) => setShowPlanned(e.target.checked)}
              style={{ accentColor: project.accent }}
            />
            Mostrar lo programado ({plannedCount})
          </label>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading > 0}
            className="rounded-full px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: project.accent }}
          >
            {uploading ? `Subiendo… (${uploading})` : "+ Subir lo ya publicado"}
          </button>
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
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="flex items-center gap-5 p-5">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-3xl font-black text-white ring-4 ring-offset-2"
              style={
                {
                  background: project.accent,
                  "--tw-ring-color": project.bg,
                } as CSSProperties
              }
            >
              {project.name[0]}
            </div>
            <div>
              <p className="text-lg font-bold">{project.instagram || project.name}</p>
              <p className="text-sm text-neutral-500">
                <b className="text-neutral-900">{all.length - plannedCount}</b> publicaciones ·{" "}
                <b className="text-neutral-900">{plannedCount}</b> programadas
              </p>
            </div>
          </div>

          {visible.length ? (
            <div className="grid grid-cols-3 gap-0.5">
              {visible.map((post) => (
                <button key={post.id} onClick={() => setEditing(post)} className="block">
                  <FeedTile
                    post={post}
                    project={project}
                    badge={isPlanned(post) ? (post.date ? shortDate(post.date) : "Sin fecha") : undefined}
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="px-6 pb-10 text-center text-sm text-neutral-500">
              Todavía no hay nada en el feed. Agrega publicaciones en el calendario o sube lo que ya
              tienes publicado.
            </p>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-neutral-600">
          Las stories no aparecen en el grid. Toca una publicación para editarla o cambiarle la foto.
        </p>
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
