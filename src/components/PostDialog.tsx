"use client";

import { useRef, useState } from "react";
import { removeImage, storeFile, storeImage, useImageUrl } from "@/lib/images";
import { deletePost, savePost } from "@/lib/store";
import {
  FORMATS,
  STATUSES,
  STATUS_LABEL,
  type Attachment,
  type Post,
  type Project,
} from "@/lib/types";
import { Chips, Field, Modal, buttonClass, darkButtonClass, inputClass } from "./Modal";

export function statusColor(status: Post["status"], project: Project) {
  if (status === "listo") return "#3d7a5c";
  if (status === "publicado") return "#1d1818";
  return project.accent;
}

const NO_PILLAR = "Sin categoría";
const CAPTION_LIMIT = 2200; // máximo de Instagram

/** Imágenes y archivos guardados en el navegador que pertenecen a un post. */
const ownedIds = (p: Post) =>
  [p.image, ...(p.slides ?? []), ...(p.files ?? []).map((f) => f.id)].filter(
    (id): id is string => !!id,
  );

/** Ficha de una publicación: carrusel, archivos, fecha y hora, formato, estado y copy. */
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
  const [uploading, setUploading] = useState(0);
  const [view, setView] = useState(0);
  const set = (fields: Partial<Post>) => setDraft((d) => ({ ...d, ...fields }));

  const media = [draft.image, ...(draft.slides ?? [])].filter((id): id is string => !!id);
  const files = draft.files ?? [];
  const setMedia = (list: string[]) => set({ image: list[0] ?? null, slides: list.slice(1) });

  const removeAll = (ids: string[]) => ids.forEach((id) => removeImage(id));
  const without = (a: Post, b: Post) => ownedIds(a).filter((id) => !ownedIds(b).includes(id));

  const cancel = () => {
    removeAll(without(draft, post));
    onClose();
  };

  const save = () => {
    removeAll(without(post, draft));
    savePost({ ...draft, title: draft.title.trim() });
    onClose();
  };

  const remove = () => {
    if (!confirm("¿Borrar esta publicación?")) return;
    removeAll([...new Set([...ownedIds(post), ...ownedIds(draft)])]);
    deletePost(post.id);
    onClose();
  };

  const addImages = async (list: File[]) => {
    const images = list.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setUploading(images.length);
    const ids: string[] = [];
    for (const file of images) {
      ids.push(await storeImage(file));
      setUploading((n) => n - 1);
    }
    setDraft((d) => {
      const next = [d.image, ...(d.slides ?? [])].filter((id): id is string => !!id).concat(ids);
      return { ...d, image: next[0] ?? null, slides: next.slice(1) };
    });
  };

  const addFiles = async (list: File[]) => {
    if (!list.length) return;
    setUploading(list.length);
    const added: Attachment[] = [];
    for (const file of list) {
      added.push({ id: await storeFile(file), name: file.name, type: file.type, size: file.size });
      setUploading((n) => n - 1);
    }
    setDraft((d) => ({ ...d, files: [...(d.files ?? []), ...added] }));
  };

  const removeMedia = (i: number) => {
    setMedia(media.filter((_, j) => j !== i));
    setView((v) => Math.max(0, Math.min(v, media.length - 2)));
  };

  const makeCover = (i: number) => {
    setMedia([media[i], ...media.filter((_, j) => j !== i)]);
    setView(0);
  };

  return (
    <Modal title={isNew ? "Nueva publicación" : "Ficha de publicación"} onClose={cancel} wide>
      <form
        className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {/* Columna izquierda: carrusel y archivos */}
        <div className="space-y-6">
          <Carousel
            media={media}
            view={Math.min(view, Math.max(0, media.length - 1))}
            onView={setView}
            onRemove={removeMedia}
            onCover={makeCover}
            onAdd={addImages}
            uploading={uploading > 0}
          />
          <Files
            files={files}
            onAdd={addFiles}
            onRemove={(id) => set({ files: files.filter((f) => f.id !== id) })}
          />
        </div>

        {/* Columna derecha: datos */}
        <div className="space-y-5">
          <Field label="Título">
            <input
              autoFocus
              className={inputClass}
              value={draft.title}
              placeholder="Ej. PDM Ximena"
              onChange={(e) => set({ title: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Fecha">
              <input
                type="date"
                className={inputClass}
                value={draft.date ?? ""}
                onChange={(e) => set({ date: e.target.value || null })}
              />
            </Field>
            <Field label="Hora">
              <input
                type="time"
                className={inputClass}
                value={draft.time ?? ""}
                onChange={(e) => set({ time: e.target.value || undefined })}
              />
            </Field>
          </div>
          {!draft.date && (
            <p className="-mt-3 text-xs text-graphite">
              Sin fecha: solo aparece en el feed, abajo de lo programado (para lo que ya estaba
              publicado).
            </p>
          )}

          <Field label="Formato">
            <Chips options={FORMATS} value={draft.format} onChange={(format) => set({ format })} />
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
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ status: s })}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] ${
                    draft.status === s
                      ? "border-ink bg-ink text-white"
                      : "border-black/10 bg-white/80"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: statusColor(s, project) }}
                  />
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={!!draft.pinned}
              onChange={(e) => set({ pinned: e.target.checked })}
              className="accent-ink"
            />
            Fijado en el perfil (va primero en el feed)
          </label>

          <Field label="Copy">
            <textarea
              rows={7}
              className={inputClass}
              value={draft.caption}
              maxLength={CAPTION_LIMIT}
              placeholder="Texto del post, hashtags, menciones…"
              onChange={(e) => set({ caption: e.target.value })}
            />
            <span className="mt-1 block text-right text-[11px] text-graphite">
              {draft.caption.length}/{CAPTION_LIMIT}
            </span>
          </Field>

          <div className="flex items-center justify-between pt-1">
            {isNew ? (
              <span />
            ) : (
              <button
                type="button"
                onClick={remove}
                className="text-[13px] text-graphite hover:text-ink hover:underline"
              >
                Borrar
              </button>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancel}
                className="rounded-full px-4 py-1.5 text-[13px] text-graphite"
              >
                Cancelar
              </button>
              <button type="submit" disabled={uploading > 0} className={darkButtonClass}>
                {uploading ? "Subiendo…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Carousel({
  media,
  view,
  onView,
  onRemove,
  onCover,
  onAdd,
  uploading,
}: {
  media: string[];
  view: number;
  onView: (i: number) => void;
  onRemove: (i: number) => void;
  onCover: (i: number) => void;
  onAdd: (files: File[]) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const url = useImageUrl(media[view] ?? null);
  const pick = () => inputRef.current?.click();

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onAdd(Array.from(e.dataTransfer.files));
        }}
        className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-[3px] border-white bg-[#dedede] shadow-md"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL local
          <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={pick}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[13px] text-graphite hover:text-ink"
          >
            <span className="text-2xl">+</span>
            {uploading ? "Subiendo…" : "Sube o arrastra la portada"}
          </button>
        )}
        {media.length > 1 && (
          <>
            <span className="absolute top-3 right-3 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] text-white">
              {view + 1}/{media.length}
            </span>
            {view > 0 && (
              <button
                type="button"
                onClick={() => onView(view - 1)}
                className="absolute top-1/2 left-2 h-8 w-8 -translate-y-1/2 rounded-full bg-white/90 shadow"
                aria-label="Anterior"
              >
                ‹
              </button>
            )}
            {view < media.length - 1 && (
              <button
                type="button"
                onClick={() => onView(view + 1)}
                className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 rounded-full bg-white/90 shadow"
                aria-label="Siguiente"
              >
                ›
              </button>
            )}
          </>
        )}
        {media.length > 0 && (
          <div className="absolute inset-x-3 bottom-3 flex justify-between gap-2">
            {view === 0 ? (
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium">
                Portada
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onCover(view)}
                className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium hover:bg-white"
              >
                Hacer portada
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemove(view)}
              className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] hover:bg-white"
            >
              Quitar
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {media.map((id, i) => (
          <Thumb key={id} id={id} active={i === view} onClick={() => onView(i)} />
        ))}
        <button
          type="button"
          onClick={pick}
          className="flex h-16 w-12 items-center justify-center rounded-lg border border-dashed border-ink/30 text-lg text-graphite hover:border-ink hover:text-ink"
          aria-label="Agregar imágenes al carrusel"
        >
          +
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-graphite">
        Carrusel: agrega varias fotos. La primera es la portada del feed.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onAdd(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Thumb({ id, active, onClick }: { id: string; active: boolean; onClick: () => void }) {
  const url = useImageUrl(id);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-16 w-12 overflow-hidden rounded-lg bg-[#dedede] transition ${
        active ? "ring-2 ring-ink ring-offset-2" : "opacity-70 hover:opacity-100"
      }`}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- blob: URL local
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}
    </button>
  );
}

function Files({
  files,
  onAdd,
  onRemove,
}: {
  files: Attachment[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Field label="Archivos">
      <div className="space-y-2">
        {files.map((f) => (
          <FileRow key={f.id} file={f} onRemove={() => onRemove(f.id)} />
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`${buttonClass} w-full border-dashed`}
        >
          + Adjuntar video, PDF o diseño
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            onAdd(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>
    </Field>
  );
}

function FileRow({ file, onRemove }: { file: Attachment; onRemove: () => void }) {
  const url = useImageUrl(file.id);
  const isVideo = file.type.startsWith("video/");
  const size =
    file.size > 1e6 ? `${(file.size / 1e6).toFixed(1)} MB` : `${Math.ceil(file.size / 1e3)} KB`;

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white/80">
      {isVideo && url && <video src={url} controls className="max-h-56 w-full bg-black" />}
      <div className="flex items-center gap-3 px-3 py-2 text-[13px]">
        <span className="rounded bg-ink/5 px-1.5 py-0.5 text-[10px] font-medium uppercase">
          {file.name.split(".").pop()?.slice(0, 4) || "file"}
        </span>
        <span className="min-w-0 flex-1 truncate">{file.name}</span>
        <span className="text-[11px] text-graphite">{size}</span>
        {url && (
          <a href={url} download={file.name} className="text-graphite hover:text-ink">
            Bajar
          </a>
        )}
        <button type="button" onClick={onRemove} className="text-graphite hover:text-ink">
          ×
        </button>
      </div>
    </div>
  );
}
