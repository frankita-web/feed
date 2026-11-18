"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { storeImage } from "@/lib/images";
import { currentState, saveIdea } from "@/lib/store";
import { notify } from "@/lib/toast";
import type { Idea, Project, Shoot } from "@/lib/types";
import { IdeaSlide, SLIDE_H, SLIDE_W } from "./IdeaSlide";
import { buttonClass, darkButtonClass } from "./Modal";

/**
 * Las ideas como presentación (láminas horizontales de 1920×1080, como en Canva): una por lámina,
 * con flechas, teclado (← →, espacio, F para pantalla completa) y deslizando el dedo en el celular.
 */
export function IdeaDeck({
  project,
  ideas,
  shoots,
  shootOptions,
  index,
  onGo,
  onKeep,
  onEdit,
}: {
  project: Project;
  ideas: Idea[];
  shoots: Shoot[];
  /** Shoots que se pueden elegir para una idea (los que vienen). */
  shootOptions: Shoot[];
  index: number;
  onGo: (index: number) => void;
  /** Después de editar una idea en la lámina: seguir mostrando esa idea aunque cambie de lugar. */
  onKeep: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const [full, setFull] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const [adding, setAdding] = useState(false);
  const [printing, setPrinting] = useState(false);
  const stopPrinting = useCallback(() => setPrinting(false), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const total = ideas.length;
  const idea = ideas[index];

  const go = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.min(total - 1, n));
      if (next === index) return;
      setDir(next > index ? 1 : -1);
      onGo(next);
    },
    [index, total, onGo],
  );

  const openFull = () => {
    setFull(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const closeFull = useCallback(() => {
    setFull(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  // Si se sale de la pantalla completa del navegador (Esc), se cierra también la vista.
  useEffect(() => {
    const onChange = () => !document.fullscreenElement && setFull(false);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const addImages = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (!images.length || !idea) return;
      setAdding(true);
      const ids: string[] = [];
      for (const file of images) {
        try {
          ids.push(await storeImage(file));
        } catch {
          notify(`No se pudo guardar ${file.name}.`, "error");
        }
      }
      setAdding(false);
      if (!ids.length) return;
      const fresh = currentState().ideas?.find((x) => x.id === idea.id) ?? idea;
      saveIdea({ ...fresh, images: [...(fresh.images ?? []), ...ids] });
      notify(
        ids.length > 1 ? `${ids.length} fotos agregadas a la idea` : "Foto agregada a la idea",
      );
    },
    [idea],
  );

  // Teclado y pegar fotos (Cmd+V), salvo mientras se escribe o hay una ventana abierta.
  useEffect(() => {
    const busy = (target: EventTarget | null) =>
      (target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) ||
      !!document.querySelector('[role="dialog"]');

    const onKey = (e: KeyboardEvent) => {
      if (busy(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      // Espacio sobre un botón lo aprieta; no también cambia de lámina.
      if (e.key === " " && e.target instanceof HTMLElement && e.target.closest("button, a")) return;
      const keys: Record<string, () => void> = {
        ArrowRight: () => go(index + 1),
        PageDown: () => go(index + 1),
        " ": () => go(index + 1),
        ArrowLeft: () => go(index - 1),
        PageUp: () => go(index - 1),
        Home: () => go(0),
        End: () => go(total - 1),
        f: () => (full ? closeFull() : openFull()),
        Escape: () => full && closeFull(),
      };
      const action = keys[e.key];
      if (!action) return;
      e.preventDefault();
      action();
    };
    const onPaste = (e: ClipboardEvent) => {
      if (busy(e.target)) return;
      const files = [...(e.clipboardData?.files ?? [])];
      if (!files.some((f) => f.type.startsWith("image/"))) return;
      e.preventDefault();
      addImages(files);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  });

  // Sin scroll de la página detrás de la pantalla completa.
  useEffect(() => {
    if (!full) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [full]);

  if (!idea)
    return (
      <p className="mx-auto mt-6 max-w-md rounded-[22px] border border-dashed border-black/15 p-10 text-center text-[14px] text-graphite">
        Todavía no hay ideas aquí. Anota la primera arriba y aparece como lámina.
      </p>
    );

  const shoot = shoots.find((s) => s.id === idea.shootId);

  const strip = (vertical: boolean) => (
    <Filmstrip
      vertical={vertical}
      ideas={ideas}
      shoots={shoots}
      project={project}
      index={index}
      onGo={go}
    />
  );

  const deck = (
    <>
      <div className={full ? "flex min-h-0 flex-1 gap-4" : "md:flex md:gap-4"}>
        {/* Al lado, en el computador: todas las ideas hacia abajo, como en PowerPoint. */}
        <div className="relative hidden w-[192px] shrink-0 md:block">{strip(true)}</div>
        <Stage
          full={full}
          onPrev={index > 0 ? () => go(index - 1) : undefined}
          onNext={index < total - 1 ? () => go(index + 1) : undefined}
          onDropFiles={addImages}
        >
          {(minFit) => (
            <div key={idea.id} className={dir > 0 ? "deck-next" : "deck-prev"}>
              <IdeaSlide
                idea={idea}
                project={project}
                shoot={shoot}
                index={index}
                total={total}
                minFit={minFit}
                shootOptions={shootOptions}
                onChange={(fields) => {
                  const fresh = currentState().ideas?.find((x) => x.id === idea.id) ?? idea;
                  saveIdea({ ...fresh, ...fields });
                  onKeep(idea.id);
                }}
              />
            </div>
          )}
        </Stage>
      </div>

      {/* En el celular, la tira va abajo. */}
      <div className="md:hidden">{strip(false)}</div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-[13px]">
        <div className="flex items-center gap-1">
          <RoundButton label="Lámina anterior" disabled={!index} onClick={() => go(index - 1)}>
            ‹
          </RoundButton>
          <span className="min-w-16 text-center text-graphite tabular-nums">
            {index + 1} / {total}
          </span>
          <RoundButton
            label="Lámina siguiente"
            disabled={index === total - 1}
            onClick={() => go(index + 1)}
          >
            ›
          </RoundButton>
        </div>
        <button onClick={() => onEdit(idea.id)} className={darkButtonClass}>
          Editar
        </button>
        <button
          onClick={() => fileInput.current?.click()}
          className={buttonClass}
          disabled={adding}
        >
          {adding ? "Guardando…" : "+ Foto de referencia"}
        </button>
        <button
          onClick={() => setPrinting(true)}
          className={buttonClass}
          disabled={printing}
          title="Todas las láminas en un PDF, una por página"
        >
          {printing ? "Preparando PDF…" : "⬇ Descargar PDF"}
        </button>
        {full ? (
          <button onClick={closeFull} className={buttonClass}>
            Salir ✕
          </button>
        ) : (
          <button onClick={openFull} className={buttonClass} title="Pantalla completa (F)">
            ⤢ Pantalla completa
          </button>
        )}
        <input
          ref={fileInput}
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
      {printing && (
        <PrintDeck ideas={ideas} shoots={shoots} project={project} onDone={stopPrinting} />
      )}
    </>
  );

  return full ? (
    <div
      role="region"
      aria-label="Presentación de ideas"
      className="fixed inset-0 z-[45] flex flex-col bg-paper px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6 sm:pt-5"
    >
      {deck}
    </div>
  ) : (
    <div>
      {deck}
      <p className="mt-3 hidden text-center text-[12px] text-graphite md:block">
        Toca el título o el texto de la lámina para escribir · ← → para cambiar · F pantalla
        completa · arrastra o pega (⌘V) una foto para sumarla como referencia
      </p>
      <p className="mt-3 text-center text-[12px] text-graphite md:hidden">
        Desliza para cambiar de lámina · gira el celular y toca «Pantalla completa» para verla
        grande
      </p>
    </div>
  );
}

/**
 * Espacio donde va la lámina: la escala para que quepa entera (alto y ancho), con flechas a los
 * lados en pantallas grandes y deslizar en el celular.
 */
function Stage({
  full,
  onPrev,
  onNext,
  onDropFiles,
  children,
}: {
  full: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onDropFiles: (files: File[]) => void;
  children: (minFit: number) => ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  // En el computador, el alto que queda en la pantalla para la lámina (deja ver los botones).
  const [height, setHeight] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const wide = window.matchMedia("(min-width: 768px)").matches;
      const rect = el.getBoundingClientRect();
      // Sin pantalla completa, la lámina cabe en lo que queda de pantalla y deja ver los botones
      // de abajo (Editar, Foto, PDF…).
      const room =
        !full && wide
          ? Math.max(320, window.innerHeight - (rect.top + window.scrollY) - BELOW)
          : null;
      setHeight(room);
      // En pantalla completa quedan 2 flechas a los lados.
      const w = rect.width - (wide && full ? 2 * (48 + 24) : 0);
      const h = room ?? rect.height;
      setScale(Math.max(0.1, Math.min(w / SLIDE_W, h / SLIDE_H)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [full]);

  // Que la letra no quede demasiado chica: si se ve chica, se achica menos y se desliza. En el
  // celular parado la lámina es una vista previa: cabe entera y se ve grande en pantalla completa.
  const minFit = !scale ? 0.6 : scale < 0.3 ? 0.5 : Math.min(1, Math.max(0.55, 10 / (24 * scale)));

  return (
    <div
      ref={box}
      className={
        full
          ? "relative flex min-h-0 min-w-0 flex-1 items-center justify-center"
          : "relative flex aspect-video w-full items-center justify-center md:aspect-auto md:min-w-0 md:flex-1"
      }
      style={height ? { height } : undefined}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touch.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        if (dx < 0) onNext?.();
        else onPrev?.();
      }}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes("Files")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setOver(false);
        onDropFiles([...e.dataTransfer.files]);
      }}
    >
      <div className={full ? "hidden md:block" : "hidden"}>
        <RoundButton label="Lámina anterior" disabled={!onPrev} onClick={onPrev} big>
          ‹
        </RoundButton>
      </div>
      {scale > 0 && (
        <div className={full ? "md:mx-6" : ""} style={{ width: SLIDE_W * scale }}>
          <div
            className={`relative rounded-[calc(56px*var(--s))] transition ${
              over ? "ring-4 ring-ink" : ""
            }`}
            style={{ width: SLIDE_W * scale, height: SLIDE_H * scale, ["--s" as string]: scale }}
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
              {children(minFit)}
            </div>
            {over && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[inherit] bg-ink/40 text-[15px] font-medium text-white">
                Suelta para agregar como referencia
              </div>
            )}
          </div>
        </div>
      )}
      <div className={full ? "hidden md:block" : "hidden"}>
        <RoundButton label="Lámina siguiente" disabled={!onNext} onClick={onNext} big>
          ›
        </RoundButton>
      </div>
    </div>
  );
}

/** Lo que queda debajo de la lámina en el computador: los botones y la ayuda. */
const BELOW = 110;

/**
 * Las láminas en chiquito, como en PowerPoint o Canva: al lado y hacia abajo en el computador,
 * abajo en el celular. Se ve en cuál vas y se salta a cualquiera tocándola.
 */
function Filmstrip({
  vertical,
  ideas,
  shoots,
  project,
  index,
  onGo,
}: {
  vertical: boolean;
  ideas: Idea[];
  shoots: Shoot[];
  project: Project;
  index: number;
  onGo: (i: number) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const width = vertical ? 164 : 150;
  const s = width / SLIDE_W;

  // La lámina actual siempre a la vista: si quedó fuera de la tira, se desliza lo justo.
  useEffect(() => {
    const el = strip.current;
    const thumb = el?.children[index] as HTMLElement | undefined;
    if (!el || !thumb) return;
    const [start, size, view, scroll] = vertical
      ? [thumb.offsetTop, thumb.offsetHeight, el.clientHeight, el.scrollTop]
      : [thumb.offsetLeft, thumb.offsetWidth, el.clientWidth, el.scrollLeft];
    let to: number | null = null;
    if (start - 12 < scroll) to = start - 12;
    else if (start + size + 12 > scroll + view) to = start + size + 12 - view;
    if (to !== null)
      el.scrollTo({ [vertical ? "top" : "left"]: Math.max(0, to), behavior: "smooth" });
  }, [index, vertical]);

  return (
    <div
      ref={strip}
      className={
        vertical
          ? "absolute inset-0 flex flex-col gap-3 overflow-y-auto overscroll-contain py-2 pr-2 pl-6"
          : "relative flex gap-3 overflow-x-auto px-2 pt-3 pb-2"
      }
    >
      {ideas.map((idea, i) => (
        <div
          key={idea.id}
          role="button"
          tabIndex={0}
          aria-label={`Lámina ${i + 1}: ${idea.title || "Idea sin título"}`}
          aria-current={i === index || undefined}
          title={idea.title}
          onClick={() => onGo(i)}
          onKeyDown={(e) => e.key === "Enter" && onGo(i)}
          className={`relative shrink-0 cursor-pointer rounded-[8px] transition ${
            i === index
              ? "ring-[3px] ring-ink ring-offset-2 ring-offset-paper"
              : "opacity-70 hover:opacity-100"
          }`}
          style={{ width, height: SLIDE_H * s }}
        >
          <div className="h-full w-full overflow-hidden rounded-[8px]">
            <div inert style={{ transform: `scale(${s})`, transformOrigin: "0 0" }}>
              <IdeaSlide
                idea={idea}
                project={project}
                shoot={shoots.find((x) => x.id === idea.shootId)}
                index={i}
                total={ideas.length}
                minFit={0.45}
              />
            </div>
          </div>
          {/* El número: al lado en la columna (como PowerPoint), encima en la tira de abajo. */}
          <span
            className={
              vertical
                ? "absolute top-0 -left-5 text-[11px] text-graphite tabular-nums"
                : "absolute bottom-1 left-1.5 rounded-[5px] bg-black/60 px-1.5 text-[11px] font-medium text-white tabular-nums"
            }
          >
            {i + 1}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Descargar en PDF: arma todas las láminas en tamaño real (una por página de 1920×1080) y abre la
 * ventana de imprimir, donde se elige «Guardar como PDF».
 */
function PrintDeck({
  ideas,
  shoots,
  project,
  onDone,
}: {
  ideas: Idea[];
  shoots: Shoot[];
  project: Project;
  onDone: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const title = document.title;
    const finish = () => {
      document.title = title;
      window.removeEventListener("afterprint", finish);
      onDone();
    };
    (async () => {
      // Espera a que carguen las fotos (máximo unos segundos) para que salgan en el PDF.
      const images = [...(box.current?.querySelectorAll("img") ?? [])];
      await Promise.race([
        Promise.all(
          images.map((img) =>
            img.complete
              ? null
              : new Promise((r) => img.addEventListener("load", r, { once: true })),
          ),
        ),
        new Promise((r) => setTimeout(r, 6000)),
      ]);
      await new Promise((r) => setTimeout(r, 300));
      if (cancelled) return;
      document.title = `${project.name} · Ideas`;
      window.addEventListener("afterprint", finish);
      window.print();
    })();
    return () => {
      cancelled = true;
      document.title = title;
      window.removeEventListener("afterprint", finish);
    };
  }, [onDone, project.name]);

  return createPortal(
    <div ref={box} className="print-deck" aria-hidden>
      {ideas.map((idea, i) => (
        <div key={idea.id} className="print-slide">
          <IdeaSlide
            idea={idea}
            project={project}
            shoot={shoots.find((x) => x.id === idea.shootId)}
            index={i}
            total={ideas.length}
            minFit={0.4}
          />
        </div>
      ))}
    </div>,
    document.body,
  );
}

function RoundButton({
  label,
  disabled,
  onClick,
  big,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  big?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`silver flex shrink-0 items-center justify-center rounded-full leading-none text-ink transition hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 ${
        big ? "h-12 w-12 pb-1 text-[30px]" : "h-8 w-8 pb-0.5 text-[20px]"
      }`}
    >
      {children}
    </button>
  );
}
