"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { shortDate } from "@/lib/dates";
import { useImageUrl } from "@/lib/images";
import {
  ideaFormat,
  linkLabel,
  parsePlan,
  siteName,
  splitReferences,
  type PlanLine,
  type PlanSection,
  type RefLink,
} from "@/lib/ideaPlan";
import { FORMATS, paletteOf, type Format, type Idea, type Project, type Shoot } from "@/lib/types";

/**
 * Tamaño real de la lámina (presentación horizontal, como Canva o PowerPoint). Se achica entera
 * para caber en la pantalla.
 */
export const SLIDE_W = 1920;
export const SLIDE_H = 1080;

/** Fotos de referencia de una idea: las suyas + las de su lámina en el plan del shoot. */
export function ideaImages(idea: Idea, shoot?: Shoot) {
  const fromShoot =
    shoot?.slides?.find((s) => s.title.trim() && s.title.trim() === idea.title.trim())?.images ??
    [];
  return [...new Set([...(idea.images ?? []), ...fromShoot])];
}

const TITLE =
  "mt-[30px] max-w-[1640px] text-[104px] leading-[0.98] font-medium tracking-[-0.02em] uppercase";

/** Qué tan claro es un color (0 = negro, 1 = blanco). */
function lightness(hex: string) {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  if (Number.isNaN(n)) return 0.5;
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/**
 * Colores de la marca para la lámina: el más oscuro de fondo y el más claro para la letra (en
 * Cancino, rojo oscuro con rosado).
 */
function slideColors(project: Project) {
  const colors = [...new Set(paletteOf(project))].sort((a, b) => lightness(a) - lightness(b));
  const bg = colors[0] ?? "#161616";
  const fg = colors[colors.length - 1] ?? "#ffffff";
  // Si la marca no tiene un color oscuro y uno claro, va en negro y blanco.
  return lightness(fg) - lightness(bg) < 0.35 ? { bg: "#161616", fg: "#ffffff" } : { bg, fg };
}

/**
 * Una idea en una lámina de 1920×1080, con los colores de la marca y en este orden, para leerla
 * fácil: arriba las referencias (fotos y links), al medio el formato y la idea en grande, y abajo
 * el resto del plan (hook, tomas, audio, copy, qué se necesita) en columnas.
 * Si el texto no cabe, todo se achica parejo (hasta `minFit`); si aun así no cabe, se desliza.
 */
export function IdeaSlide({
  idea,
  project,
  shoot,
  index,
  total,
  minFit = 0.6,
  onChange,
}: {
  idea: Idea;
  project: Project;
  shoot?: Shoot;
  index: number;
  total: number;
  minFit?: number;
  /** Si viene, la lámina se edita ahí mismo: el título se escribe encima y el texto de abajo se abre al tocarlo. */
  onChange?: (fields: Partial<Idea>) => void;
}) {
  const [writing, setWriting] = useState(false);
  const refs = splitReferences(parsePlan(idea.notes), idea.link);
  const { plan, links } = refs;
  const { format, details } = ideaFormat(idea, plan);
  const images = [...ideaImages(idea, shoot), ...refs.images];
  const hook = plan.sections.find((s) => /^hook/i.test(s.title));
  const rest = plan.sections.filter((s) => s !== hook);
  const empty = !plan.intro.length && !plan.sections.length;
  const { bg, fg } = slideColors(project);
  const pad = (n: number) => String(n).padStart(2, "0");
  const where = shoot
    ? `${shoot.title || "Shoot"}${shoot.date ? ` · ${shortDate(shoot.date)}` : ""}`
    : "Idea suelta";
  const blocks = [
    ...(plan.intro.length ? [{ title: "", sub: "", lines: plan.intro }] : []),
    ...(hook ? [hook] : []),
    ...rest,
  ];

  return (
    <div
      className="relative overflow-hidden rounded-[32px]"
      style={{ width: SLIDE_W, height: SLIDE_H, background: bg, color: fg } as CSSProperties}
    >
      <Fit
        minFit={minFit}
        bg={bg}
        watch={`${idea.title}|${idea.notes}|${idea.link}|${images.join()}|${idea.done}|${idea.format}|${writing}`}
      >
        {/* Arriba: las referencias (mientras se escribe se esconden, para dar espacio). */}
        {!writing && images.length > 0 && <Images ids={images} />}
        {!writing && links.length > 0 && (
          <div
            className={`flex flex-wrap justify-center gap-x-[40px] gap-y-[10px] text-[22px] tracking-[0.04em] uppercase ${
              images.length ? "mt-[22px]" : ""
            }`}
          >
            {links.map((l) => (
              <LinkItem key={l.href} link={l} />
            ))}
          </div>
        )}
        {!writing && refs.notes.length > 0 && (
          <p className="mt-[12px] text-center text-[22px] opacity-75">{refs.notes.join(" · ")}</p>
        )}

        {/* Al medio: el formato y la idea en grande. */}
        <div className="flex flex-1 flex-col items-center justify-center py-[44px] text-center">
          {/* Qué contenido es: se ve como una etiqueta y, al editar, se elige ahí mismo. */}
          {onChange ? (
            <label className="relative inline-flex cursor-pointer items-center rounded-full border-[3px] border-current px-[34px] py-[8px] text-[30px] font-medium tracking-[0.08em] uppercase hover:bg-black/10">
              {format ?? "Elige el formato"}
              <span className="ml-[14px] text-[22px] opacity-70">▾</span>
              <select
                aria-label="Formato del contenido"
                value={format ?? ""}
                onChange={(e) => {
                  onChange({ format: (e.target.value || null) as Format | null });
                  // Para que las flechas vuelvan a cambiar de lámina.
                  e.currentTarget.blur();
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                <option value="">Sin formato</option>
                {FORMATS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
          ) : (
            <span className="inline-flex rounded-full border-[3px] border-current px-[34px] py-[8px] text-[30px] font-medium tracking-[0.08em] uppercase">
              {format ?? "Idea"}
            </span>
          )}
          <p className="mt-[18px] text-[24px] leading-[1.25] tracking-[0.06em] uppercase opacity-75">
            {[details, idea.pillar, where, idea.done && "✓ ya grabada"].filter(Boolean).join(" · ")}
          </p>
          {onChange ? (
            <h2
              key={`${idea.id}|${idea.title}`}
              contentEditable="plaintext-only"
              suppressContentEditableWarning
              spellCheck={false}
              data-placeholder="Escribe la idea"
              title="Toca para escribir"
              onBlur={(e) => {
                const title = (e.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim();
                if (title !== idea.title) onChange({ title });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") {
                  e.currentTarget.textContent = idea.title;
                  e.currentTarget.blur();
                }
              }}
              className={`${TITLE} cursor-text rounded-[20px] outline-offset-[14px] outline-current/40 hover:outline-[3px] hover:outline-dashed focus:outline-[3px] focus:outline-solid empty:before:opacity-50 empty:before:content-[attr(data-placeholder)] ${
                idea.done ? "line-through decoration-[6px]" : ""
              }`}
            >
              {idea.title}
            </h2>
          ) : (
            <h2 className={`${TITLE} ${idea.done ? "line-through decoration-[6px]" : ""}`}>
              {idea.title || "Idea sin título"}
            </h2>
          )}
          {empty && !onChange && (
            <p className="mt-[40px] text-[26px] tracking-[0.06em] uppercase opacity-70">
              Falta escribir cómo sería · toca «Editar»
            </p>
          )}
        </div>

        {/* Abajo: el resto del plan, en columnas. Al tocarlo se abre para escribir. */}
        {writing && onChange ? (
          <div
            className="border-t-[2px] pt-[28px]"
            style={{ borderColor: `color-mix(in srgb, ${fg} 35%, transparent)` }}
          >
            <textarea
              autoFocus
              defaultValue={idea.notes}
              spellCheck={false}
              placeholder={
                "Reel vertical 9:16 · 15 s\n\nHOOK: qué pasa en el primer segundo.\nTexto: «LO QUE DICE EN PANTALLA»\n\nTOMAS\n1. …\n\nCOPY: …"
              }
              onBlur={(e) => {
                setWriting(false);
                if (e.target.value !== idea.notes) onChange({ notes: e.target.value });
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.currentTarget.value = idea.notes;
                  e.currentTarget.blur();
                }
              }}
              className="h-[560px] w-full resize-none rounded-[20px] bg-black/20 p-[28px] text-[26px] leading-[1.45] outline-none placeholder:text-current/40"
              style={{ color: fg }}
            />
            <p className="mt-[10px] text-[18px] tracking-[0.08em] uppercase opacity-70">
              Se guarda solo al tocar afuera · Esc para no guardar
            </p>
          </div>
        ) : blocks.length > 0 ? (
          <div
            onClick={(e) => {
              if (onChange && !(e.target as HTMLElement).closest("a")) setWriting(true);
            }}
            title={onChange ? "Toca para escribir" : undefined}
            className={`border-t-[2px] pt-[36px] text-[24px] leading-[1.4] ${
              onChange ? "cursor-text rounded-[12px] hover:bg-black/10" : ""
            }`}
            style={{
              borderColor: `color-mix(in srgb, ${fg} 35%, transparent)`,
              // Columnas parejas: cada parte va entera y se reparten para quedar del mismo alto.
              columnCount: Math.min(blocks.length, 4),
              columnGap: 56,
            }}
          >
            {blocks.map((section, i) => (
              <Block key={i} section={section} fg={fg} bg={bg} />
            ))}
          </div>
        ) : (
          onChange && (
            <button
              onClick={() => setWriting(true)}
              className="mx-auto mb-[40px] rounded-[20px] border-[3px] border-dashed border-current/40 px-[48px] py-[28px] text-[26px] tracking-[0.06em] uppercase opacity-80 hover:opacity-100"
            >
              + Toca aquí para escribir cómo sería
            </button>
          )
        )}

        <p className="mt-[6px] text-center text-[20px] tracking-[0.08em] uppercase opacity-60">
          {project.name} · Ideas · {pad(index + 1)} / {pad(total)}
        </p>
      </Fit>
    </div>
  );
}

/**
 * Achica el contenido parejo (texto y fotos) hasta que quepa en la lámina, como «ajustar» en
 * Keynote: se hace más ancho y se escala, así el texto vuelve a cortarse bien.
 */
function Fit({
  minFit,
  bg,
  watch,
  children,
}: {
  minFit: number;
  bg: string;
  watch: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const sizer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  // Si no cabe ni achicado: aviso abajo de que hay más, hasta que se llega al final.
  const [more, setMore] = useState(false);
  const check = () => {
    const el = box.current;
    if (el) setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
  };

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const fits = (kk: number) => {
      el.style.width = `${SLIDE_W / kk}px`;
      el.style.minHeight = `${SLIDE_H / kk}px`;
      return el.scrollHeight * kk <= SLIDE_H + 1;
    };
    const measure = () => {
      let best = 1;
      if (!fits(1)) {
        let lo = Math.min(minFit, 1);
        let hi = 1;
        best = lo;
        for (let i = 0; i < 8; i++) {
          const mid = (lo + hi) / 2;
          if (fits(mid)) {
            best = mid;
            lo = mid;
          } else hi = mid;
        }
      }
      fits(best);
      setK(best);
      // El alto que se ve ya achicado: así, si hay que deslizar, no sobra espacio al final.
      const height = el.scrollHeight * best;
      if (sizer.current) sizer.current.style.height = `${height}px`;
      if (box.current) box.current.scrollTop = 0;
      setMore(height > SLIDE_H + 1);
    };
    measure();
    document.fonts?.ready.then(measure);
  }, [minFit, watch]);

  return (
    <>
      <div
        ref={box}
        onScroll={check}
        className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        <div ref={sizer} className="overflow-hidden">
          <div
            ref={inner}
            className="flex flex-col px-[64px] pt-[56px] pb-[40px]"
            style={{ transform: `scale(${k})`, transformOrigin: "0 0" }}
          >
            {children}
          </div>
        </div>
      </div>
      {more && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[170px] items-end justify-center pb-[28px]"
          style={{ background: `linear-gradient(to bottom, transparent, ${bg})` }}
        >
          <span
            className="rounded-full px-[28px] py-[10px] text-[22px] tracking-[0.06em] uppercase"
            style={{ background: "currentColor" }}
          >
            <span style={{ color: bg }}>Hay más abajo ↓</span>
          </span>
        </div>
      )}
    </>
  );
}

/** Una parte del plan (hook, tomas, audio…) en una columna de abajo. */
function Block({ section, fg, bg }: { section: PlanSection; fg: string; bg: string }) {
  return (
    <section className="mb-[30px] break-inside-avoid">
      {section.title && (
        <h3 className="mb-[12px] text-[20px] tracking-[0.1em] uppercase opacity-70">
          {section.title}
          {section.sub && <span className="normal-case"> · {section.sub}</span>}
        </h3>
      )}
      <Lines lines={section.lines} fg={fg} bg={bg} />
    </section>
  );
}

function Lines({ lines, fg, bg }: { lines: PlanLine[]; fg: string; bg: string }) {
  return (
    <div className="space-y-[10px]">
      {lines.map((l, i) =>
        l.kind === "step" ? (
          <div key={i} className="flex gap-[14px]">
            <span className="w-[30px] shrink-0 tabular-nums opacity-70">{l.n}.</span>
            <p>
              <Inline text={l.text} fg={fg} bg={bg} />
            </p>
          </div>
        ) : l.kind === "overlay" ? (
          <div key={i} className="pt-[4px]">
            <Overlay text={l.text} fg={fg} bg={bg} />
          </div>
        ) : (
          <p key={i}>
            <Inline text={l.text} fg={fg} bg={bg} />
          </p>
        ),
      )}
    </div>
  );
}

/** Texto con «frases en pantalla» marcadas como en el video, y links que se abren. */
function Inline({ text, fg, bg }: { text: string; fg: string; bg: string }) {
  return text.split(/(«[^»]+»|https?:\/\/\S+)/).map((part, i) =>
    part.startsWith("«") ? (
      <Overlay key={i} text={part.slice(1, -1)} fg={fg} bg={bg} />
    ) : /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer" className="underline">
        {linkLabel(part)} ↗
      </a>
    ) : (
      part
    ),
  );
}

/** Texto en pantalla, en los colores al revés (como un sticker sobre el video). */
function Overlay({ text, fg, bg }: { text: string; fg: string; bg: string }) {
  return (
    <span
      className="inline-block rounded-[0.2em] px-[0.35em] py-[0.04em] align-middle text-[0.9em] leading-tight font-semibold tracking-tight uppercase"
      style={{ background: fg, color: bg }}
    >
      {text}
    </span>
  );
}

/** Las fotos de referencia en una fila arriba, como una tira de contactos. */
function Images({ ids }: { ids: string[] }) {
  const shown = ids.slice(0, 6);
  return (
    <div className="flex justify-center gap-[16px]">
      {shown.map((id) => (
        <RefImage key={id} id={id} />
      ))}
    </div>
  );
}

function RefImage({ id }: { id: string }) {
  const external = /^https?:\/\//.test(id);
  const local = useImageUrl(external ? null : id);
  const url = external ? id : local;
  return (
    <div className="h-[300px] w-[280px] shrink-0 overflow-hidden bg-black/20">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- foto local, guardada o de un link
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}

function LinkItem({ link }: { link: RefLink }) {
  const site = siteName(link.href);
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer"
      className="underline-offset-4 hover:underline"
    >
      {site}
      {link.label ? ` · ${link.label}` : ""} ↗
    </a>
  );
}
