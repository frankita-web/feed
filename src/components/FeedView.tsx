"use client";

import { useRef, useState } from "react";
import { shortDate, todayKey } from "@/lib/dates";
import { storeImage } from "@/lib/images";
import { addPosts, newPost } from "@/lib/store";
import type { Post, Project } from "@/lib/types";
import { Bow } from "./Bow";
import { FeedTile, feedPosts } from "./FeedTile";
import { buttonClass } from "./Modal";
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <label className={`${buttonClass} flex cursor-pointer items-center gap-2`}>
            <input
              type="checkbox"
              checked={showPlanned}
              onChange={(e) => setShowPlanned(e.target.checked)}
              style={{ accentColor: project.accent }}
            />
            mostrar lo programado ({plannedCount})
          </label>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading > 0}
            className="rounded-full px-5 py-1.5 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgb(120_40_70/0.6)] disabled:opacity-60"
            style={{ background: project.accent }}
          >
            {uploading ? `subiendo… (${uploading})` : "+ subir lo ya publicado"}
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

        <div
          className="relative rounded-[44px] p-3 shadow-[0_30px_60px_-30px_rgb(150_70_95/0.6)]"
          style={{ background: project.bg }}
        >
          <Bow color="#fffaf6" className="absolute -top-5 left-1/2 z-10 h-10 w-16 -translate-x-1/2 drop-shadow-sm" />
          <div className="overflow-hidden rounded-[34px] bg-[#fffdfb]">
            <div className="flex items-center gap-5 px-6 pt-8 pb-5">
              <div
                className="rounded-full p-[3px]"
                style={{ background: `linear-gradient(135deg, ${project.bg}, ${project.accent})` }}
              >
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white font-display text-4xl text-white italic"
                  style={{ background: project.accent }}
                >
                  {project.name[0].toLowerCase()}
                </div>
              </div>
              <div>
                <p className="font-display text-2xl leading-tight font-medium italic">
                  {project.instagram || project.name.toLowerCase()}
                </p>
                <p className="mt-1 text-xs tracking-wide text-mauve">
                  <span className="font-medium text-ink">{all.length - plannedCount}</span>{" "}
                  publicaciones · <span className="font-medium text-ink">{plannedCount}</span>{" "}
                  programadas
                </p>
              </div>
            </div>

            {visible.length ? (
              <div className="grid grid-cols-3 gap-[3px]">
                {visible.map((post) => (
                  <button key={post.id} onClick={() => setEditing(post)} className="block">
                    <FeedTile
                      post={post}
                      project={project}
                      badge={
                        isPlanned(post) ? (post.date ? shortDate(post.date) : "sin fecha") : undefined
                      }
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-6 pb-12 text-center font-display text-lg text-mauve italic">
                todavía no hay nada en el feed ♡ agrega publicaciones en el calendario o sube lo
                que ya tienes publicado.
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 text-center font-display text-base text-mauve italic">
          las stories no aparecen en el grid · toca una publicación para editarla o cambiarle la
          foto
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
