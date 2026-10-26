"use client";

import { useRef, useState } from "react";
import { shortDate, todayKey } from "@/lib/dates";
import { storeImage } from "@/lib/images";
import { addPosts, newPost } from "@/lib/store";
import type { Post, Project } from "@/lib/types";
import { FeedTile, feedPosts } from "./FeedTile";
import { buttonClass, darkButtonClass } from "./Modal";
import { Orb } from "./Orb";
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
    <div className="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <label className={`${buttonClass} flex cursor-pointer items-center gap-2`}>
            <input
              type="checkbox"
              checked={showPlanned}
              onChange={(e) => setShowPlanned(e.target.checked)}
              className="accent-ink"
            />
            Mostrar lo programado ({plannedCount})
          </label>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading > 0}
            className={darkButtonClass}
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

        <div className="silver overflow-hidden rounded-[32px]">
          <div className="flex items-center gap-5 px-6 pt-7 pb-5">
            <Orb project={project} className="h-20 w-20 shrink-0" />
            <div>
              <p className="text-xl font-semibold tracking-[-0.03em]">
                {project.instagram || project.name.toLowerCase()}
              </p>
              <p className="mt-0.5 text-[13px] text-graphite">
                <span className="font-medium text-ink">{all.length - plannedCount}</span>{" "}
                publicaciones · <span className="font-medium text-ink">{plannedCount}</span>{" "}
                programadas
              </p>
            </div>
          </div>

          {visible.length ? (
            <div className="grid grid-cols-3 gap-[2px]">
              {visible.map((post) => (
                <button key={post.id} onClick={() => setEditing(post)} className="block">
                  <FeedTile
                    post={post}
                    badge={
                      isPlanned(post) ? (post.date ? shortDate(post.date) : "sin fecha") : undefined
                    }
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="px-6 pb-12 text-center text-[13px] text-graphite">
              Todavía no hay nada en el feed. Agrega publicaciones en el calendario o sube lo que
              ya tienes publicado.
            </p>
          )}
        </div>
        <p className="mt-5 text-center text-[12px] text-graphite">
          Las stories no aparecen en el grid · toca una publicación para editarla
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
