"use client";

import { useRef, useState, type DragEvent } from "react";
import { takeFromBank, useBank } from "@/lib/bank";
import { removeImage, storeFile, storeImage, useImageUrl } from "@/lib/images";
import { linkUrl, storeMedia } from "@/lib/media";
import { deletePost, savePost, usedByShoots } from "@/lib/store";
import {
  FORMATS,
  STATUSES,
  STATUS_LABEL,
  type Attachment,
  type BankItem,
  type Post,
  type Project,
} from "@/lib/types";
import { Chips, Field, Modal, buttonClass, darkButtonClass, inputClass } from "./Modal";
import { StatusDot } from "./Status";

const NO_PILLAR = "Sin categoría";
const CAPTION_LIMIT = 2200; // máximo de Instagram

const isVideo = (f: Attachment) => f.type.startsWith("video/");

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
  onSaved,
}: {
  project: Project;
  post: Post;
  isNew: boolean;
  onClose: () => void;
  /** Se llama al guardar (p. ej. para vincular el entregable con el post). */
  onSaved?: (post: Post) => void;
}) {
  const [draft, setDraft] = useState(post);
  const [uploading, setUploading] = useState(0);
  const [view, setView] = useState(0);
  // Lo ya guardado de esta publicación: la portada elegida se guarda en el momento.
  const committed = useRef(post);
  const frameId = useRef<string | null>(null);
  const set = (fields: Partial<Post>) => setDraft((d) => ({ ...d, ...fields }));

  const media = [draft.image, ...(draft.slides ?? [])].filter((id): id is string => !!id);
  const files = draft.files ?? [];
  const videos = files.filter(isVideo);
  const setMedia = (list: string[]) => set({ image: list[0] ?? null, slides: list.slice(1) });

  const bank = useBank();
  const [picked, setPicked] = useState<BankItem[]>([]);
  const available = bank.items.filter(
    (b) => b.project === project.slug && !picked.some((p) => p.id === b.id),
  );
  const borrowed = new Set(picked.flatMap((b) => [b.image, ...b.files.map((f) => f.id)]));

  /** Lo del banco entra a la ficha; sale del banco recién al guardar. */
  const pickFromBank = (item: BankItem) => {
    setPicked((list) => [...list, item]);
    setDraft((d) => {
      const current = [d.image, ...(d.slides ?? [])].filter((id): id is string => !!id);
      const next = item.image ? [...current, item.image] : current;
      return {
        ...d,
        image: next[0] ?? null,
        slides: next.slice(1),
        files: [...(d.files ?? []), ...item.files],
        title: d.title || item.name,
      };
    });
  };

  const removeAll = (ids: string[]) =>
    ids
      .filter((id) => !usedByShoots(id) && !borrowed.has(id))
      .forEach((id) => removeImage(id));
  const without = (a: Post, b: Post) => ownedIds(a).filter((id) => !ownedIds(b).includes(id));

  const cancel = () => {
    removeAll(without(draft, committed.current));
    onClose();
  };

  const save = () => {
    removeAll(without(committed.current, draft));
    const saved = {
      ...draft,
      title: draft.title.trim(),
      // Con fecha nueva, el post vuelve a su lugar según la fecha.
      ...(draft.date !== post.date && { order: undefined }),
    };
    savePost(saved);
    picked
      .filter((b) => [b.image, ...b.files.map((f) => f.id)].some((id) => id && ownedIds(saved).includes(id)))
      .forEach((b) => takeFromBank(b.id));
    onSaved?.(saved);
    onClose();
  };

  const remove = () => {
    if (!confirm("¿Borrar esta publicación?")) return;
    removeAll([...new Set([...ownedIds(committed.current), ...ownedIds(draft)])]);
    deletePost(post.id);
    onClose();
  };

  /** Fotos y videos desde la compu. Un video sin portada usa uno de sus cuadros. */
  const addMedia = async (list: File[]) => {
    const chosen = list.filter((f) => /^(image|video)\//.test(f.type));
    if (!chosen.length) return;
    setUploading(chosen.length);
    try {
      const added = await storeMedia(chosen, media.length > 0);
      const ids = [added.cover, ...added.slides].filter((id): id is string => !!id);
      setDraft((d) => {
        const next = [d.image, ...(d.slides ?? [])].filter((id): id is string => !!id).concat(ids);
        return {
          ...d,
          image: next[0] ?? null,
          slides: next.slice(1),
          files: [...(d.files ?? []), ...added.files],
        };
      });
    } catch (error) {
      console.error(error);
      alert("No se pudo agregar ese archivo.");
    }
    setUploading(0);
  };

  /** Un cuadro del video pasa a ser la portada. */
  const useFrame = async (frame: File) => {
    setUploading(1);
    try {
      const id = await storeImage(frame);
      const swap = (p: Post) => {
        const current = [p.image, ...(p.slides ?? [])].filter((x): x is string => !!x);
        // Volver a elegir reemplaza el cuadro anterior; en un carrusel no se pierden las fotos.
        const others = current.filter((x) => x !== frameId.current);
        const next = others.length > 1 ? [id, ...others] : [id];
        return { ...p, image: next[0], slides: next.slice(1) };
      };
      const before = committed.current;
      frameId.current = id;
      setDraft((d) => swap(d));
      setView(0);
      if (!isNew) {
        const saved = swap(before);
        committed.current = saved;
        savePost(saved);
        removeAll(without(before, saved));
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar la portada. Inténtalo de nuevo.");
    }
    setUploading(0);
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
    if (i < media.length) setMedia(media.filter((_, j) => j !== i));
    else set({ files: files.filter((f) => f.id !== videos[i - media.length].id) });
    setView((v) => Math.max(0, Math.min(v, media.length + videos.length - 2)));
  };

  const moveMedia = (from: number, to: number) => {
    if (to < 0 || to >= media.length || from === to) return;
    const next = [...media];
    next.splice(to, 0, ...next.splice(from, 1));
    setMedia(next);
    setView(to);
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
            videos={videos}
            view={Math.min(view, Math.max(0, media.length + videos.length - 1))}
            onView={setView}
            onRemove={removeMedia}
            onCover={makeCover}
            onMove={moveMedia}
            onFrame={useFrame}
            onAdd={addMedia}
            uploading={uploading > 0}
          />
          {available.length > 0 && (
            <Field label="Elegir del banco">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {available.map((item) => (
                  <BankChoice key={item.id} item={item} onPick={() => pickFromBank(item)} />
                ))}
              </div>
            </Field>
          )}
          <Files
            files={files.filter((f) => !isVideo(f))}
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
                  <StatusDot status={s} project={project} className="h-2 w-2" />
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Link del video">
            <div className="flex items-center gap-2">
              <input
                type="url"
                className={inputClass}
                value={draft.videoLink ?? ""}
                placeholder="Pega aquí el link de Dropbox"
                onChange={(e) => set({ videoLink: e.target.value.trim() || undefined })}
              />
              {linkUrl(draft.videoLink) && (
                <a
                  href={linkUrl(draft.videoLink)}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[13px] text-graphite hover:text-ink"
                >
                  Abrir ↗
                </a>
              )}
            </div>
            <span className="mt-1 block text-[11px] text-graphite">
              En el PDF aparece un botón “Ver video” para apretarlo.
            </span>
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
              placeholder="Texto del post, menciones…"
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
  videos,
  view,
  onView,
  onRemove,
  onCover,
  onMove,
  onFrame,
  onAdd,
  uploading,
}: {
  media: string[];
  videos: Attachment[];
  view: number;
  onView: (i: number) => void;
  onRemove: (i: number) => void;
  onCover: (i: number) => void;
  onMove: (from: number, to: number) => void;
  onFrame: (frame: File) => void;
  onAdd: (files: File[]) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const total = media.length + videos.length;
  const video = view >= media.length ? videos[view - media.length] : undefined;
  const url = useImageUrl(video ? video.id : (media[view] ?? null));
  const pick = () => inputRef.current?.click();

  const captureFrame = async () => {
    const el = videoRef.current;
    if (!el?.videoWidth) {
      alert("El video todavía no carga. Espera un momento e inténtalo de nuevo.");
      return;
    }
    el.pause();
    const canvas = document.createElement("canvas");
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    canvas.getContext("2d")!.drawImage(el, 0, 0);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.92));
    if (blob) onFrame(new File([blob], "portada.jpg", { type: "image/jpeg" }));
  };

  const dropOnThumb = (e: DragEvent, i: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragged !== null) onMove(dragged, i);
    else onAdd(Array.from(e.dataTransfer.files));
    setDragged(null);
    setOver(null);
  };

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
        {video && url ? (
          <video
            key={video.id}
            ref={videoRef}
            src={url}
            controls
            playsInline
            onError={() => setBroken(video.id)}
            className="absolute inset-0 h-full w-full bg-black object-contain"
          />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL local
          <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={pick}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[13px] text-graphite hover:text-ink"
          >
            <span className="text-2xl">+</span>
            {uploading ? "Subiendo…" : "Sube o arrastra fotos o videos"}
          </button>
        )}
        {total > 1 && (
          <>
            <span className="absolute top-3 right-3 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] text-white">
              {view + 1}/{total}
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
            {view < total - 1 && (
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
        {total > 0 && !video && (
          <div className="absolute inset-x-3 bottom-3 flex justify-between gap-2">
            <div className="flex gap-1.5">
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
              {media.length > 1 && (
                <>
                  <button
                    type="button"
                    disabled={view === 0}
                    onClick={() => onMove(view, view - 1)}
                    className="h-6 w-6 rounded-full bg-white/90 text-[12px] hover:bg-white disabled:opacity-40"
                    aria-label="Mover antes"
                    title="Mover antes"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    disabled={view === media.length - 1}
                    onClick={() => onMove(view, view + 1)}
                    className="h-6 w-6 rounded-full bg-white/90 text-[12px] hover:bg-white disabled:opacity-40"
                    aria-label="Mover después"
                    title="Mover después"
                  >
                    →
                  </button>
                </>
              )}
            </div>
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

      {video && (
        <div className="mt-3 rounded-xl border border-black/10 bg-white/80 p-3">
          <p className="text-[12px] text-graphite">
            {broken === video.id
              ? "Este video no se puede abrir: ya no está guardado o el archivo falló. Quítalo y elige otro del banco o súbelo de nuevo."
              : "Pausa el video en el momento que te guste y úsalo de portada."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {broken !== video.id && (
              <button type="button" onClick={captureFrame} className={darkButtonClass}>
                Usar este cuadro de portada
              </button>
            )}
            {url && (
              <a
                href={url}
                download={video.name}
                className="text-[13px] text-graphite hover:text-ink"
              >
                Bajar
              </a>
            )}
            <button
              type="button"
              onClick={() => onRemove(view)}
              className="ml-auto text-[13px] text-graphite hover:text-ink"
            >
              Quitar video
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {media.map((id, i) => (
          <Thumb
            key={id}
            id={id}
            active={i === view}
            cover={i === 0}
            target={over === i && dragged !== null && dragged !== i}
            onClick={() => onView(i)}
            onDragStart={() => setDragged(i)}
            onDragEnd={() => {
              setDragged(null);
              setOver(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(i);
            }}
            onDrop={(e) => dropOnThumb(e, i)}
          />
        ))}
        {videos.map((file, i) => (
          <VideoThumb
            key={file.id}
            id={file.id}
            active={media.length + i === view}
            onClick={() => onView(media.length + i)}
          />
        ))}
        <button
          type="button"
          onClick={pick}
          className="flex h-16 w-12 items-center justify-center rounded-lg border border-dashed border-ink/30 text-lg text-graphite hover:border-ink hover:text-ink"
          aria-label="Agregar fotos o videos"
        >
          +
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-graphite">
        {media.length > 1
          ? "Arrastra las miniaturas para cambiar el orden. La primera es la portada del feed."
          : "Agrega fotos o videos con el +. La primera foto es la portada del feed."}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
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

function Thumb({
  id,
  active,
  cover,
  target,
  onClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  id: string;
  active: boolean;
  cover: boolean;
  target: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}) {
  const url = useImageUrl(id);
  return (
    <button
      type="button"
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      title="Arrastra para cambiar el orden"
      className={`relative h-16 w-12 cursor-grab overflow-hidden rounded-lg bg-[#dedede] transition active:cursor-grabbing ${
        target
          ? "ring-2 ring-ink ring-offset-2 scale-105"
          : active
            ? "ring-2 ring-ink ring-offset-2"
            : "opacity-70 hover:opacity-100"
      }`}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- blob: URL local
        <img src={url} alt="" draggable={false} className="h-full w-full object-cover" />
      )}
      {cover && (
        <span className="absolute inset-x-0 bottom-0 bg-ink/70 text-center text-[8px] text-white">
          Portada
        </span>
      )}
    </button>
  );
}

function BankChoice({ item, onPick }: { item: BankItem; onPick: () => void }) {
  const video = item.files.find(isVideo);
  const image = useImageUrl(item.image);
  const clip = useImageUrl(item.image ? null : (video?.id ?? null));
  return (
    <button
      type="button"
      onClick={onPick}
      title={item.name}
      className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-[#dedede] opacity-80 transition hover:opacity-100"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- archivo guardado
        <img src={image} alt={item.name} className="h-full w-full object-cover" />
      ) : (
        clip && (
          <video
            src={`${clip}#t=0.1`}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        )
      )}
      {video && (
        <span className="absolute top-1 left-1 text-[10px] text-white drop-shadow">▶</span>
      )}
    </button>
  );
}

function VideoThumb({
  id,
  active,
  onClick,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
}) {
  const url = useImageUrl(id);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ver video"
      className={`relative h-16 w-12 overflow-hidden rounded-lg bg-black transition ${
        active ? "ring-2 ring-ink ring-offset-2" : "opacity-70 hover:opacity-100"
      }`}
    >
      {url && (
        <video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      )}
      <span className="absolute inset-0 flex items-center justify-center text-[14px] text-white">
        ▶
      </span>
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
          + Adjuntar PDF o diseño
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
  const size =
    file.size > 1e6 ? `${(file.size / 1e6).toFixed(1)} MB` : `${Math.ceil(file.size / 1e3)} KB`;

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white/80">
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
