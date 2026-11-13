"use client";

import { useEffect, useState } from "react";
import type { Project } from "@/lib/types";
import { buttonClass } from "./Modal";

type Spread = [left: string | null, right: string | null];

/** Portada sola a la derecha, el interior abierto, y la contraportada sola a la izquierda. */
function spreadsOf(pages: string[]): Spread[] {
  const [cover, ...rest] = pages;
  const back = rest.length % 2 ? rest.pop()! : null;
  const inside: Spread[] = [];
  for (let i = 0; i < rest.length; i += 2) inside.push([rest[i], rest[i + 1] ?? null]);
  return [[null, cover], ...inside, ...(back ? [[back, null] as Spread] : [])];
}

/** Menú impreso abierto como librito, para tenerlo a mano mientras se planea. */
export function MenuView({ project }: { project: Project }) {
  const menu = project.menu!;
  const [booklet, setBooklet] = useState(0);
  const [index, setIndex] = useState(1); // se abre en el interior
  const [zoom, setZoom] = useState<string | null>(null);

  const spreads = spreadsOf(menu.booklets[booklet].pages);
  const at = Math.min(index, spreads.length - 1);
  const go = (i: number) => setIndex(Math.max(0, Math.min(spreads.length - 1, i)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (zoom) return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(spreads.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spreads.length, zoom]);

  const [left, right] = spreads[at];
  const label =
    at === 0 ? "Portada" : at === spreads.length - 1 && !right ? "Contraportada" : "Adentro";

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-16 sm:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex rounded-full border border-black/10 bg-white/50 p-1">
          {menu.booklets.map((b, i) => (
            <button
              key={b.name}
              onClick={() => {
                setBooklet(i);
                setIndex(1);
              }}
              className={`rounded-full px-4 py-1 text-[13px] transition ${
                booklet === i ? "bg-ink font-medium text-white" : "hover:bg-white/70"
              }`}
            >
              {b.name}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-[13px] text-graphite">
          {menu.title}
          {menu.pdf && (
            <a href={menu.pdf} target="_blank" rel="noreferrer" className={buttonClass}>
              PDF ↗
            </a>
          )}
        </div>
      </div>

      {/* Mesa oscura con el menú abierto encima */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#0d0d0d] px-4 py-10 sm:px-14 sm:py-16">
        <div
          key={`${booklet}-${at}`}
          className="mx-auto flex max-w-5xl animate-[menu-in_.35s_ease-out] flex-col items-center gap-4 sm:flex-row sm:items-stretch sm:justify-center sm:gap-0"
        >
          <Page src={left} side="left" onZoom={setZoom} name={project.name} />
          <Page src={right} side="right" onZoom={setZoom} name={project.name} />
        </div>

        <button
          onClick={() => go(at - 1)}
          disabled={at === 0}
          className="absolute top-1/2 left-3 h-10 w-10 -translate-y-1/2 rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20 disabled:opacity-0"
          aria-label="Página anterior"
        >
          ‹
        </button>
        <button
          onClick={() => go(at + 1)}
          disabled={at === spreads.length - 1}
          className="absolute top-1/2 right-3 h-10 w-10 -translate-y-1/2 rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20 disabled:opacity-0"
          aria-label="Página siguiente"
        >
          ›
        </button>

        <div className="mt-8 flex items-center justify-center gap-2">
          {spreads.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Ir a la vista ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === at ? "w-6 bg-white" : "w-1.5 bg-white/30"}`}
            />
          ))}
        </div>
        <p className="mt-3 text-center text-[12px] text-white/50">
          {label} · toca una página para verla grande · ← → para pasar
        </p>
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4 backdrop-blur-sm sm:p-10"
          onClick={() => setZoom(null)}
        >
          <button
            className="fixed top-4 right-5 text-3xl text-white/80 hover:text-white"
            aria-label="Cerrar"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- página del menú */}
          <img src={zoom} alt="" className="mx-auto w-full max-w-3xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}

function Page({
  src,
  side,
  onZoom,
  name,
}: {
  src: string | null;
  side: "left" | "right";
  onZoom: (src: string) => void;
  name: string;
}) {
  if (!src) return <div className="hidden aspect-[0.76] w-1/2 sm:block" />;
  // Sombra del pliegue hacia el centro, como un papel doblado.
  const fold =
    side === "left"
      ? "linear-gradient(to left, rgb(0 0 0 / 0.22), transparent 7%)"
      : "linear-gradient(to right, rgb(0 0 0 / 0.18), transparent 6%)";
  return (
    <button
      onClick={() => onZoom(src)}
      className="relative aspect-[0.76] w-full cursor-zoom-in shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)] sm:w-1/2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- página del menú */}
      <img src={src} alt={`Menú de ${name}`} className="h-full w-full object-cover" />
      <span className="pointer-events-none absolute inset-0" style={{ background: fold }} />
    </button>
  );
}
