"use client";

import { useRef, useState } from "react";
import { removeImage, storeImage, useImageUrl } from "@/lib/images";
import { deletePost, savePost } from "@/lib/store";
import { FORMATS, STATUSES, STATUS_LABEL, type Post, type Project } from "@/lib/types";
import { Chips, Field, Modal, inputClass } from "./Modal";

export function statusColor(status: Post["status"], project: Project) {
  if (status === "listo") return "#2fa84f";
  if (status === "publicado") return "#262626";
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
            className="relative aspect-[4/5] w-28 shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 text-xs text-neutral-400 hover:border-neutral-400"
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob: URL local
              <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="px-2">{uploading ? "Subiendo…" : "+ Subir imagen o portada"}</span>
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
                className="text-xs text-neutral-500 underline"
              >
                Quitar imagen
              </button>
            )}
          </div>
        </div>
        {!draft.date && (
          <p className="-mt-2 text-xs text-neutral-500">
            Sin fecha: solo aparece en el feed, abajo de lo programado (para lo que ya estaba
            publicado).
          </p>
        )}

        <Field label="Formato">
          <Chips
            options={FORMATS}
            value={draft.format}
            onChange={(format) => set({ format })}
            color={project.accent}
          />
        </Field>

        {project.pillars.length > 0 && (
          <Field label="Categoría">
            <Chips
              options={[...project.pillars.map((p) => p.name), NO_PILLAR]}
              value={draft.pillar ?? NO_PILLAR}
              onChange={(v) => set({ pillar: v === NO_PILLAR ? null : v })}
              color={project.accent}
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
                  className="rounded-full border px-3 py-1 text-sm"
                  style={
                    active
                      ? { background: c, borderColor: c, color: "white" }
                      : { borderColor: "#e5e5e5", color: c }
                  }
                >
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
            <button type="button" onClick={remove} className="text-sm text-red-600 hover:underline">
              Borrar
            </button>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={cancel} className="rounded-full px-4 py-2 text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: project.accent }}
            >
              Guardar
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
