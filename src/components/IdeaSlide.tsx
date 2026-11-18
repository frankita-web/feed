"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { shortDate } from "@/lib/dates";
import { useImageUrl } from "@/lib/images";
import {
  linkLabel,
  parsePlan,
  siteName,
  splitReferences,
  type PlanLine,
  type PlanSection,
  type RefLink,
} from "@/lib/ideaPlan";
import type { Idea, Project, Shoot } from "@/lib/types";
import { Logo } from "./Logo";

/** Tamaño real de la lámina (presentación horizontal, como Canva o PowerPoint). Se achica entera
 * para caber en la pantalla. */
export const SLIDE_W = 1920;
export const SLIDE_H = 1080;

/** Fotos de referencia de una idea: las suyas + las de su lámina en el plan del shoot. */
export function ideaImages(idea: Idea, shoot?: Shoot) {
  const fromShoot =
    shoot?.slides?.find((s) => s.title.trim() && s.title.trim() === idea.title.trim())?.images ??
    [];
  return [...new Set([...(idea.images ?? []), ...fromShoot])];
}

/**
 * Una idea en una lámina de 1920×1080, en dos columnas: a la izquierda el título, el hook y las
 * tomas; a la derecha las referencias (fotos y links) y el resto del plan (audio, copy, qué se
 * necesita). Si el texto no cabe, todo se achica parejo (hasta `minFit`); si aun así no cabe, se
 * desliza.
 */
export function IdeaSlide({
  idea,
  project,
  shoot,
  index,
  total,
  minFit = 0.6,
}: {
  idea: Idea;
  project: Project;
  shoot?: Shoot;
  index: number;
  total: number;
  minFit?: number;
}) {
  const refs = splitReferences(parsePlan(idea.notes), idea.link);
  const { plan, links } = refs;
  const images = [...ideaImages(idea, shoot), ...refs.images];
  const hook = plan.sections.find((s) => /^hook/i.test(s.title));
  const rest = plan.sections.filter((s) => s !== hook);
  // Las tomas (la primera sección con pasos numerados) van con el hook; lo demás, a la derecha.
  const steps = rest.find((s) => s.lines.some((l) => l.kind === "step"));
  const side = rest.filter((s) => s !== steps);
  const hasRefs = images.length > 0 || links.length > 0 || refs.notes.length > 0;
  const twoColumns = hasRefs || side.length > 0;
  const empty = !plan.intro.length && !plan.sections.length;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="silver relative overflow-hidden rounded-[48px] text-ink"
      style={{ width: SLIDE_W, height: SLIDE_H }}
    >
      <Fit
        minFit={minFit}
        watch={`${idea.title}|${idea.notes}|${idea.link}|${images.join()}|${idea.done}`}
      >
        <header className="flex items-center justify-between gap-6 text-[24px] text-graphite">
          <span className="flex items-center gap-4">
            <Logo project={project} className="h-[60px] w-[60px]" />
            <span>
              <span className="font-semibold text-ink">{project.name}</span> · Ideas
            </span>
          </span>
          <span className="tabular-nums">
            {pad(index + 1)} / {pad(total)}
          </span>
        </header>

        <div
          className={`mt-[48px] grid gap-x-[88px] ${
            twoColumns ? "grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" : "grid-cols-1"
          }`}
        >
          <div>
            <p className="text-[22px] font-medium tracking-[0.1em] text-graphite uppercase">
              {shoot
                ? `${shoot.title || "Shoot"}${shoot.date ? ` · ${shortDate(shoot.date)}` : ""}`
                : "Idea suelta · sin shoot"}
            </p>
            <h2
              className={`mt-[14px] leading-[1.02] font-semibold tracking-[-0.035em] ${
                twoColumns || !empty ? "text-[80px]" : "max-w-[1500px] text-[112px]"
              } ${idea.done ? "text-ink/45 line-through decoration-[6px]" : ""}`}
            >
              {idea.title || "Idea sin título"}
            </h2>

            {(plan.format || idea.pillar || idea.done) && (
              <div className="mt-[28px] flex flex-wrap gap-[12px] text-[24px]">
                {plan.format && <Chip>🎬 {plan.format}</Chip>}
                {idea.pillar && <Chip>{idea.pillar}</Chip>}
                {idea.done && <Chip dark>✓ Ya grabada</Chip>}
              </div>
            )}

            {plan.intro.length > 0 && (
              <div className="mt-[36px]">
                <Lines lines={plan.intro} />
              </div>
            )}

            {hook && <Hook section={hook} accent={project.accent} />}
            {steps && <Section section={steps} />}

            {empty && (
              <p className="mt-[56px] max-w-[760px] rounded-[36px] border-[3px] border-dashed border-black/15 p-[44px] text-[30px] text-graphite">
                Todavía no está escrito cómo sería. Toca «Editar» para contarlo.
              </p>
            )}
          </div>

          {twoColumns && (
            <div>
              {hasRefs && (
                <section>
                  <Label>Referencias</Label>
                  {images.length > 0 && <Images ids={images} roomy={!side.length} />}
                  {refs.notes.length > 0 && (
                    <div className="mt-[20px]">
                      <Lines lines={refs.notes.map((text) => ({ kind: "text", text }))} />
                    </div>
                  )}
                  {links.length > 0 && (
                    <div className="mt-[20px] space-y-[14px]">
                      {links.map((l) => (
                        <LinkCard key={l.href} link={l} />
                      ))}
                    </div>
                  )}
                </section>
              )}
              {side.map((section, i) => (
                <Section key={i} section={section} first={!hasRefs && i === 0} />
              ))}
            </div>
          )}
        </div>
      </Fit>
    </div>
  );
}

/**
 * Achica el contenido parejo (texto y fotos) hasta que quepa en la lámina, como «ajustar» en
 * Keynote: se hace más ancho y se escala, así el texto vuelve a cortarse bien.
 */
function Fit({ minFit, watch, children }: { minFit: number; watch: string; children: ReactNode }) {
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
            className="flex flex-col px-[96px] pt-[64px] pb-[80px] text-[32px] leading-[1.38]"
            style={{ transform: `scale(${k})`, transformOrigin: "0 0" }}
          >
            {children}
          </div>
        </div>
      </div>
      {more && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[190px] items-end justify-center bg-linear-to-b from-transparent to-[#e2e2e2] pb-[32px]">
          <span className="rounded-full bg-ink px-[28px] py-[10px] text-[24px] font-medium text-white">
            Hay más abajo ↓
          </span>
        </div>
      )}
    </>
  );
}

function Chip({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <span
      className={`rounded-full px-[22px] py-[6px] ${dark ? "bg-ink text-white" : "bg-black/[0.06] text-ink"}`}
    >
      {children}
    </span>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-[14px] flex flex-wrap items-baseline gap-x-[12px] text-[22px] font-medium tracking-[0.1em] text-graphite uppercase">
      {children}
    </h3>
  );
}

function Hook({ section, accent }: { section: PlanSection; accent: string }) {
  return (
    <section
      className="mt-[40px] rounded-[36px] border-l-[10px] bg-white px-[44px] py-[36px] shadow-[0_10px_40px_-20px_rgb(0_0_0/0.25)]"
      style={{ borderColor: accent }}
    >
      <Label>
        <span className="font-semibold text-ink">{section.title}</span>
        {section.sub && <span className="tracking-normal normal-case">{section.sub}</span>}
      </Label>
      <div className="text-[38px] leading-[1.25] font-medium">
        <Lines lines={section.lines} />
      </div>
    </section>
  );
}

function Section({ section, first }: { section: PlanSection; first?: boolean }) {
  const copy = /^copy/i.test(section.title);
  return (
    <section className={first ? "" : "mt-[40px]"}>
      <Label>
        <span>{section.title}</span>
        {section.sub && <span className="tracking-normal normal-case">{section.sub}</span>}
      </Label>
      <div className={copy ? "rounded-[28px] bg-white/75 px-[32px] py-[26px]" : ""}>
        <Lines lines={section.lines} />
      </div>
    </section>
  );
}

function Lines({ lines }: { lines: PlanLine[] }) {
  return (
    <div className="space-y-[12px]">
      {lines.map((l, i) =>
        l.kind === "step" ? (
          <div key={i} className="flex gap-[20px]">
            <span className="mt-[1px] flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-ink text-[22px] font-semibold text-white">
              {l.n}
            </span>
            <p>
              <Inline text={l.text} />
            </p>
          </div>
        ) : l.kind === "overlay" ? (
          <div key={i} className="flex flex-wrap items-center gap-[16px] pt-[6px]">
            <span className="text-[22px] font-normal text-graphite">{l.label} en pantalla</span>
            <Overlay text={l.text} />
          </div>
        ) : (
          <p key={i}>
            <Inline text={l.text} />
          </p>
        ),
      )}
    </div>
  );
}

/** Texto con «frases en pantalla» marcadas como en el video, y links que se abren. */
function Inline({ text }: { text: string }) {
  return text.split(/(«[^»]+»|https?:\/\/\S+)/).map((part, i) =>
    part.startsWith("«") ? (
      <Overlay key={i} text={part.slice(1, -1)} />
    ) : /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded-full bg-white px-[0.55em] align-middle text-[0.8em] font-medium shadow-sm"
      >
        {linkLabel(part)} ↗
      </a>
    ) : (
      part
    ),
  );
}

function Overlay({ text }: { text: string }) {
  return (
    <span className="inline-block rounded-[0.25em] bg-ink px-[0.4em] py-[0.06em] align-middle text-[0.85em] leading-tight font-extrabold tracking-tight text-white uppercase">
      {text}
    </span>
  );
}

/** Las fotos de referencia, en una grilla que cambia según cuántas son. */
function Images({ ids, roomy }: { ids: string[]; roomy: boolean }) {
  const n = ids.length;
  const cols = n === 1 ? 1 : n === 2 || n === 4 ? 2 : 3;
  const aspect =
    n === 1
      ? roomy
        ? "4 / 3"
        : "16 / 10"
      : n === 2
        ? "4 / 5"
        : n === 3
          ? "3 / 4"
          : n === 4
            ? "4 / 3"
            : "1 / 1";
  return (
    <div
      className="grid gap-[14px]"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {ids.map((id) => (
        <RefImage key={id} id={id} aspect={aspect} />
      ))}
    </div>
  );
}

function RefImage({ id, aspect }: { id: string; aspect: string }) {
  const external = /^https?:\/\//.test(id);
  const local = useImageUrl(external ? null : id);
  const url = external ? id : local;
  return (
    <div className="overflow-hidden rounded-[28px] bg-[#dedede]" style={{ aspectRatio: aspect }}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- foto local, guardada o de un link
        <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
      )}
    </div>
  );
}

const MARKS: Record<string, string> = {
  Pinterest: "P",
  Instagram: "IG",
  Tiktok: "TT",
  Youtube: "▶",
  Youtu: "▶",
  Canva: "C",
  Drive: "D",
};

function LinkCard({ link }: { link: RefLink }) {
  const site = siteName(link.href);
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-[24px] rounded-[28px] bg-white px-[28px] py-[20px] shadow-[0_10px_40px_-24px_rgb(0_0_0/0.35)] ring-1 ring-black/5"
    >
      <span className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[18px] bg-ink text-[26px] font-bold text-white">
        {MARKS[site] ?? site.charAt(0)}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[28px] font-medium">
          {link.label || linkLabel(link.href)}
        </span>
        <span className="mt-[4px] block truncate text-[22px] text-graphite">
          {link.label ? linkLabel(link.href) : link.href.replace(/^https?:\/\/(www\.)?/, "")}
        </span>
      </span>
      <span className="text-[36px] text-graphite">↗</span>
    </a>
  );
}
