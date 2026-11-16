"use client";

import { useRef, useState } from "react";
import type { TimelineRequest, TimelineResult } from "@/app/api/timeline/route";
import { removeImage, storeImage, useImageUrl } from "@/lib/images";
import { shootPdf } from "@/lib/pdf";
import { saveShoot } from "@/lib/store";
import { notify } from "@/lib/toast";
import type { BriefSlide, Idea, Project, Shoot, TimelineBlock } from "@/lib/types";
import { Modal, buttonClass, darkButtonClass, inputClass } from "./Modal";
import { PdfButton } from "./PdfButton";

export const SECTIONS = [
  "Concepto creativo",
  "Referencias visuales",
  "Moodboard",
  "Idea para el shoot",
  "Frases y narrativa",
  "Preguntas",
  "Logística",
];

const newId = () => crypto.randomUUID();

/** Suma minutos a una hora HH:MM. */
export function addMinutes(time: string, minutes: number) {
  const [h, m] = (time || "00:00").split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Plan del shoot: timeline del día y presentación para el fotógrafo, con PDF profesional. */
export function ShootPlan({
  project,
  shoot,
  ideas,
  onClose,
}: {
  project: Project;
  shoot: Shoot;
  ideas: Idea[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"timeline" | "presentacion">("timeline");
  const set = (fields: Partial<Shoot>) => saveShoot({ ...shoot, ...fields });
  const mine = ideas.filter((i) => i.shootId === shoot.id);

  return (
    <Modal title="Plan del shoot" onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={inputClass}
          value={shoot.title}
          placeholder="Nombre del shoot (ej. Shoot menú de invierno)"
          onChange={(e) => set({ title: e.target.value })}
        />
        <input
          type="date"
          className={inputClass}
          value={shoot.date ?? ""}
          onChange={(e) => set({ date: e.target.value || null })}
          aria-label="Día del shoot"
        />
        <input
          className={inputClass}
          value={shoot.place ?? ""}
          placeholder="Lugar (ej. Crissis, Mayorga 118)"
          onChange={(e) => set({ place: e.target.value })}
        />
        <input
          className={inputClass}
          value={shoot.crew}
          placeholder="Equipo (ej. Foto: Carlo · Video: Ana)"
          onChange={(e) => set({ crew: e.target.value })}
        />
      </div>

      <div className="mt-5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-white/60 p-1 text-[13px]">
          {(
            [
              ["timeline", "Timeline del día"],
              ["presentacion", "Presentación"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 ${tab === key ? "bg-ink text-white" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
        <PdfButton make={() => shootPdf(project, shoot, mine)} />
      </div>

      {tab === "timeline" ? (
        <TimelineEditor project={project} shoot={shoot} ideas={mine} set={set} />
      ) : (
        <SlidesEditor shoot={shoot} ideas={mine} set={set} />
      )}
    </Modal>
  );
}

function TimelineEditor({
  project,
  shoot,
  ideas,
  set,
}: {
  project: Project;
  shoot: Shoot;
  ideas: Idea[];
  set: (fields: Partial<Shoot>) => void;
}) {
  const blocks = shoot.timeline ?? [];
  const [busy, setBusy] = useState(false);
  const setBlocks = (timeline: TimelineBlock[]) => set({ timeline });
  const update = (id: string, fields: Partial<TimelineBlock>) =>
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...fields } : b)));

  const add = () => {
    const last = blocks[blocks.length - 1];
    setBlocks([
      ...blocks,
      {
        id: newId(),
        time: last ? addMinutes(last.time, last.minutes) : "10:00",
        minutes: 60,
        activity: "",
        notes: "",
        products: [],
      },
    ]);
  };

  async function withAi() {
    if (blocks.length && !confirm("Se reemplaza el timeline por uno nuevo armado con las ideas de este shoot. ¿Seguir?"))
      return;
    setBusy(true);
    notify("Armando el timeline…", "loading", "timeline");
    try {
      const request: TimelineRequest = {
        project: project.name,
        shoot: shoot.title,
        start: blocks[0]?.time ?? "10:00",
        ideas: ideas.map((i) => ({ title: i.title, notes: i.notes })),
        current: blocks.length
          ? blocks.map((b) => `${b.time} (${b.minutes} min) ${b.activity} — ${b.products.map((p) => p.text).join(", ")}`).join("\n")
          : undefined,
      };
      const response = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const result = (await response.json()) as Partial<TimelineResult> & { error?: string };
      if (!response.ok || !result.blocks) throw new Error(result.error ?? "No pude armar el timeline.");
      setBlocks(
        result.blocks.map((b) => ({
          id: newId(),
          time: /^\d{1,2}:\d{2}$/.test(b.time) ? b.time.padStart(5, "0") : "10:00",
          minutes: Math.max(5, Math.round(b.minutes) || 30),
          activity: b.activity,
          notes: b.notes,
          products: b.products.filter(Boolean).map((text) => ({ text, done: false })),
        })),
      );
      notify("Listo: timeline armado. Revísalo y ajusta lo que quieras.", "ok", "timeline");
    } catch (error) {
      notify((error as Error).message, "error", "timeline");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button onClick={withAi} disabled={busy} className={buttonClass} title="Usa las ideas que están en la columna de este shoot">
          {busy ? "Armando…" : "✨ Armar con las ideas del shoot"}
        </button>
        {blocks.length > 0 && (
          <span className="self-center text-[12px] text-graphite">
            {blocks[0].time} a {addMinutes(blocks[blocks.length - 1].time, blocks[blocks.length - 1].minutes)} ·{" "}
            {Math.round(blocks.reduce((t, b) => t + b.minutes, 0) / 6) / 10} h
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="grid grid-cols-[112px_1fr_1fr] bg-ink px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-white uppercase">
          <span>Hora</span>
          <span>Actividad</span>
          <span>Producto</span>
        </div>
        {blocks.map((b, i) => (
          <div key={b.id} className="grid grid-cols-[112px_1fr_1fr] gap-3 border-t border-black/10 px-3 py-3">
            <div className="space-y-1">
              <input
                type="time"
                className="w-full bg-transparent text-[14px] font-semibold text-[#d93b3b] outline-none"
                value={b.time}
                onChange={(e) => update(b.id, { time: e.target.value })}
              />
              <label className="flex items-center gap-1 text-[11px] text-graphite">
                <input
                  type="number"
                  min={5}
                  step={5}
                  className="w-11 rounded border border-black/10 px-1 text-[11px]"
                  value={b.minutes}
                  onChange={(e) => update(b.id, { minutes: Number(e.target.value) || 0 })}
                />
                min
              </label>
              <div className="flex gap-2 pt-1 text-[11px] text-graphite">
                <button
                  disabled={!i}
                  onClick={() => {
                    const next = [...blocks];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    setBlocks(next);
                  }}
                  aria-label="Subir"
                >
                  ↑
                </button>
                <button
                  disabled={i === blocks.length - 1}
                  onClick={() => {
                    const next = [...blocks];
                    [next[i + 1], next[i]] = [next[i], next[i + 1]];
                    setBlocks(next);
                  }}
                  aria-label="Bajar"
                >
                  ↓
                </button>
                <button
                  onClick={() => confirm("¿Borrar este bloque?") && setBlocks(blocks.filter((x) => x.id !== b.id))}
                  className="hover:text-ink"
                >
                  Borrar
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <textarea
                rows={2}
                className="w-full resize-none bg-transparent text-[14px] leading-snug outline-none"
                value={b.activity}
                placeholder="Qué se hace (ej. Contenido 1 — entradas + drinks)"
                onChange={(e) => update(b.id, { activity: e.target.value })}
              />
              <input
                className="w-full bg-transparent font-mono text-[12px] text-[#d93b3b] outline-none placeholder:text-[#d93b3b]/40"
                value={b.notes}
                placeholder="formato (ej. video horizontal o foto)"
                onChange={(e) => update(b.id, { notes: e.target.value })}
              />
            </div>
            <Products
              items={b.products}
              onChange={(products) => update(b.id, { products })}
            />
          </div>
        ))}
        <button onClick={add} className="w-full border-t border-black/10 py-3 text-[13px] text-graphite hover:text-ink">
          + Agregar bloque
        </button>
      </div>
    </div>
  );
}

function Products({
  items,
  onChange,
}: {
  items: TimelineBlock["products"];
  onChange: (items: TimelineBlock["products"]) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="rounded-xl bg-[#e3f5ea] p-2.5">
      <ul className="space-y-1">
        {items.map((p, k) => (
          <li key={k} className="group flex items-start gap-2 text-[13px] leading-snug">
            <input
              type="checkbox"
              checked={p.done}
              onChange={() => onChange(items.map((x, j) => (j === k ? { ...x, done: !x.done } : x)))}
              className="mt-0.5 accent-ink"
            />
            <span className={`flex-1 ${p.done ? "text-graphite line-through" : ""}`}>{p.text}</span>
            <button
              onClick={() => onChange(items.filter((_, j) => j !== k))}
              className="text-graphite opacity-0 group-hover:opacity-100"
              aria-label="Quitar"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onChange([...items, { text: text.trim(), done: false }]);
          setText("");
        }}
      >
        <input
          className="mt-1 w-full bg-transparent text-[12px] outline-none placeholder:text-graphite/70"
          value={text}
          placeholder="+ producto (Enter)"
          onChange={(e) => setText(e.target.value)}
        />
      </form>
    </div>
  );
}

function SlidesEditor({
  shoot,
  ideas,
  set,
}: {
  shoot: Shoot;
  ideas: Idea[];
  set: (fields: Partial<Shoot>) => void;
}) {
  const slides = shoot.slides ?? [];
  const setSlides = (list: BriefSlide[]) => set({ slides: list });
  const add = (fields: Partial<BriefSlide> = {}) =>
    setSlides([
      ...slides,
      { id: newId(), section: "Idea para el shoot", title: "", text: "", link: "", images: [], ...fields },
    ]);
  const missingIdeas = ideas.filter((i) => !slides.some((s) => s.title === i.title));

  return (
    <div>
      <p className="mb-3 text-[13px] text-graphite">
        Cada lámina es una hoja del PDF: concepto, referencias, moodboard o cada idea, con fotos, texto y
        link. Las fotos se guardan en este navegador.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => add()} className={darkButtonClass}>
          + Agregar lámina
        </button>
        {missingIdeas.length > 0 && (
          <button
            onClick={() =>
              setSlides([
                ...slides,
                ...missingIdeas.map((i) => ({
                  id: newId(),
                  section: "Idea para el shoot",
                  title: i.title,
                  text: i.notes,
                  link: i.link,
                  images: [],
                })),
              ])
            }
            className={buttonClass}
          >
            + Traer las {missingIdeas.length} ideas de este shoot
          </button>
        )}
      </div>

      <div className="space-y-4">
        {slides.map((s, i) => (
          <SlideCard
            key={s.id}
            slide={s}
            index={i}
            total={slides.length}
            onChange={(fields) => setSlides(slides.map((x) => (x.id === s.id ? { ...x, ...fields } : x)))}
            onMove={(delta) => {
              const next = [...slides];
              const j = i + delta;
              [next[i], next[j]] = [next[j], next[i]];
              setSlides(next);
            }}
            onRemove={() => {
              if (!confirm("¿Borrar esta lámina?")) return;
              s.images.forEach((id) => !id.startsWith("/") && removeImage(id));
              setSlides(slides.filter((x) => x.id !== s.id));
            }}
          />
        ))}
        {!slides.length && (
          <p className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-[13px] text-graphite">
            Todavía no hay láminas. Empieza con el concepto creativo o trae las ideas del shoot.
          </p>
        )}
      </div>
    </div>
  );
}

function SlideCard({
  slide,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  slide: BriefSlide;
  index: number;
  total: number;
  onChange: (fields: Partial<BriefSlide>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  async function addImages(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setUploading(images.length);
    const ids: string[] = [];
    for (const file of images) {
      try {
        ids.push(await storeImage(file));
      } catch {
        notify(`No se pudo guardar ${file.name}.`, "error");
      }
    }
    setUploading(0);
    onChange({ images: [...slide.images, ...ids] });
  }

  return (
    <div
      className="rounded-2xl border border-black/10 bg-white p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        addImages([...e.dataTransfer.files]);
      }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[#d93b3b]">{String(index + 1).padStart(2, "0")}</span>
          <select
            className="rounded-lg border border-black/10 bg-white px-2 py-1 text-[12px]"
            value={SECTIONS.includes(slide.section) ? slide.section : "__otra__"}
            onChange={(e) => onChange({ section: e.target.value === "__otra__" ? "" : e.target.value })}
          >
            {SECTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
            <option value="__otra__">Otra…</option>
          </select>
          {!SECTIONS.includes(slide.section) && (
            <input
              className="rounded-lg border border-black/10 px-2 py-1 text-[12px]"
              value={slide.section}
              placeholder="Nombre de la sección"
              onChange={(e) => onChange({ section: e.target.value })}
            />
          )}
        </div>
        <div className="flex gap-3 text-[12px] text-graphite">
          <button disabled={!index} onClick={() => onMove(-1)} aria-label="Subir">
            ↑
          </button>
          <button disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Bajar">
            ↓
          </button>
          <button onClick={onRemove} className="hover:text-ink">
            Borrar
          </button>
        </div>
      </div>
      <input
        className="mb-2 w-full text-[18px] font-semibold tracking-[-0.02em] outline-none"
        value={slide.title}
        placeholder="Título (ej. Personalidades de una pizza)"
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <textarea
        rows={3}
        className={`${inputClass} text-[13px]`}
        value={slide.text}
        placeholder="La idea: qué queremos, cómo se ve, encuadre, luz, quién sale…"
        onChange={(e) => onChange({ text: e.target.value })}
      />
      <input
        className={`${inputClass} mt-2 py-1.5 text-[12px]`}
        value={slide.link}
        placeholder="Link de referencia (Pinterest, reel, TikTok…)"
        onChange={(e) => onChange({ link: e.target.value })}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {slide.images.map((id) => (
          <Thumb key={id} id={id} onRemove={() => {
            if (!id.startsWith("/")) removeImage(id);
            onChange({ images: slide.images.filter((x) => x !== id) });
          }} />
        ))}
        <button
          onClick={() => input.current?.click()}
          className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-black/20 text-[11px] text-graphite"
        >
          {uploading ? "Subiendo…" : "+ fotos"}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addImages([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function Thumb({ id, onRemove }: { id: string; onRemove: () => void }) {
  const url = useImageUrl(id);
  return (
    <div className="group relative h-20 w-20 overflow-hidden rounded-lg bg-[#dedede]">
      {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL local */}
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 rounded-full bg-white/90 px-1.5 text-[11px] opacity-0 group-hover:opacity-100"
        aria-label="Quitar foto"
      >
        ×
      </button>
    </div>
  );
}
