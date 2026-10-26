"use client";

import { useRef, useState } from "react";
import { removeImage, storeImage, useImageUrl } from "@/lib/images";
import { deletePost, savePost } from "@/lib/store";
import { FORMATS, STATUSES, STATUS_LABEL, type Post, type Project } from "@/lib/types";
import { Chips, Field, Modal, darkButtonClass, inputClass } from "./Modal";

export function statusColor(status: Post["status"], project: Project) {
  if (status === "listo") return "#3d7a5c";
  if (status === "publicado") return "#1d1818";
  return project.accent;
}

const NO_PILLAR = "Sin categoría";

export function PostDialog({
  project,
  post,
  isNew,
  onClose,
}: {
  project: Project;
  post: Post;
  isNew: boolean;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(post);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageUrl = useImageUrl(draft.image);
  const set = (fields: Partial<Post>) => setDraft((d) => ({ ...d, ...fields }));

  const discardUpload = () => {
    if (draft.image && draft.image !== post.image) removeImage(draft.image);
  };

  const cancel = () => {
    discardUpload();
    onClose();
  };

  const save = () => {
    if (post.image && post.image !== draft.image) removeImage(post.image);
    savePost({ ...draft, title: draft.title.trim() });
    onClose();
  };

  const remove = () => {
    if (!confirm("¿Borrar esta publicación?")) return;
    discardUpload();
    if (post.image) removeImage(post.image);
    deletePost(post.id);
    onClose();
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    discardUpload();
    set({ image: await storeImage(file) });
    setUploading(false);
  };

  return (
    <Modal title={isNew ? "Nueva publicación" : "Editar publicación"} onClose={cancel}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative aspect-[4/5] w-28 shrink-0 overflow-hidden rounded-lg border-[3px] border-white bg-paper font-mono text-[11px] uppercase shadow-md hover:-rotate-1"
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob: URL local
              <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="px-2">{uploading ? "subiendo…" : "+ subir imagen o portada"}</span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="flex-1 space-y-4">
            <Field label="Título">
              <input
                autoFocus
                className={inputClass}
                value={draft.title}
                placeholder="Ej. PDM Ximena"
                onChange={(e) => set({ title: e.target.value })}
              />
            </Field>
            <Field label="Fecha">
              <input
                type="date"
                className={inputClass}
                value={draft.date ?? ""}
                onChange={(e) => set({ date: e.target.value || null })}
              />
            </Field>
            {draft.image && (
              <button
                type="button"
                onClick={() => {
                  discardUpload();
                  set({ image: null });
                }}
                className="text-xs text-graphite underline"
              >
                Quitar imagen
              </button>
            )}
          </div>
        </div>
        {!draft.date && (
          <p className="-mt-2 text-xs text-graphite">
            Sin fecha: solo aparece en el feed, abajo de lo programado (para lo que ya estaba
            publicado).
          </p>
        )}

        <Field label="Formato">
          <Chips
            options={FORMATS}
            value={draft.format}
            onChange={(format) => set({ format })}
          />
        </Field>

        {project.pillars.length > 0 && (
          <Field label="Categoría">
            <Chips
              options={[...project.pillars.map((p) => p.name), NO_PILLAR]}
              value={draft.pillar ?? NO_PILLAR}
              onChange={(v) => set({ pillar: v === NO_PILLAR ? null : v })}
            />
          </Field>
        )}

        <Field label="Estado">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => {
              const active = draft.status === s;
              const c = statusColor(s, project);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ status: s })}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] ${
                    active ? "border-ink bg-ink text-white" : "border-black/10 bg-white/80"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                  {STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Copy / notas">
          <textarea
            rows={4}
            className={inputClass}
            value={draft.caption}
            placeholder="Texto del post, ideas, hashtags…"
            onChange={(e) => set({ caption: e.target.value })}
          />
        </Field>

        <div className="flex items-center justify-between pt-2">
          {isNew ? (
            <span />
          ) : (
            <button type="button" onClick={remove} className="text-[13px] text-graphite hover:text-ink hover:underline">
              Borrar
            </button>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={cancel} className="rounded-full px-4 py-1.5 text-[13px] text-graphite">
              Cancelar
            </button>
            <button type="submit" disabled={uploading} className={darkButtonClass}>
              Guardar
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
