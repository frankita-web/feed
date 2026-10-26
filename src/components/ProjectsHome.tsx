"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { MONTHS, monthKey, shortDate, todayKey } from "@/lib/dates";
import { slugify, useStore } from "@/lib/store";
import type { Post, Project, State } from "@/lib/types";
import { Folder, Selected } from "./Desktop";
import { FeedTile } from "./FeedTile";
import { buttonClass, darkButtonClass } from "./Modal";
import { ProjectDialog } from "./ProjectDialog";
import { Dots, Orb, Swirl } from "./Typo";
import { WordWheel, type WheelItem } from "./WordWheel";

const NEW = "__nuevo__";

const POEM: [text: string, indent: string][] = [
  ["si un feed", "0%"],
  ["fuera un calendario,", "6%"],
  ["si un", "38%"],
  ["calendario", "46%"],
  ["fuera", "66%"],
  ["un feed”", "58%"],
];

function Poem({ className = "" }: { className?: string }) {
  return (
    <div className={`relative text-[clamp(18px,2.6vw,34px)] leading-[1.25] ${className}`}>
      {POEM.map(([text, indent]) => (
        <p key={text} style={{ marginLeft: indent }}>
          <Swirl text={text} />
        </p>
      ))}
      <Dots at={[[30, 4], [31.5, 7], [42, 30], [3, 20], [6, 26], [60, 95]]} />
    </div>
  );
}

function monthStats(project: Project, posts: Post[]) {
  const now = new Date();
  const month = monthKey(now.getFullYear(), now.getMonth());
  const today = todayKey();
  const mine = posts.filter((p) => p.project === project.slug);
  return {
    count: mine.filter((p) => p.date?.startsWith(month) && p.format !== "Stories").length,
    next: mine
      .filter((p) => p.date && p.date >= today)
      .sort((a, b) => (a.date! < b.date! ? -1 : 1))[0],
  };
}

export function ProjectsHome() {
  const store = useStore();
  const [creating, setCreating] = useState(false);

  return (
    <main className="relative flex-1 overflow-hidden">
      {/* 1 · Afiche */}
      <section className="relative mx-auto max-w-6xl px-5 pt-10 sm:px-10 sm:pt-14">
        <Poem />

        <div className="relative mt-10 grid gap-6 font-mono text-[11px] leading-snug tracking-wide uppercase sm:grid-cols-3">
          <p className="h-8">
            {store && (
              <>
                {new Date().getDate()} {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
                {" ·"}
                <br />
              </>
            )}
            franca mandiola estudio,
          </p>
          <p className="sm:pt-5">
            contenido & feed
            <br />
            {store ? `${store.projects.length} proyectos` : " "}
          </p>
          <p className="sm:text-right">
            • calendario
            <br />
            feed
            <br />
            análisis mensual •
          </p>
          <Dots at={[[28, 10], [29, 40], [64, 0], [80, 75]]} className="hidden sm:block" />
        </div>

        {store && <ProjectDesktop store={store} onCreate={() => setCreating(true)} />}
      </section>

      {/* 2 · Tarjeta plateada con la esfera y la rueda */}
      {store && (
        <section className="mx-auto max-w-5xl px-5 pb-10 sm:px-10">
          <ProjectPicker store={store} onCreate={() => setCreating(true)} />
        </section>
      )}

      {/* 3 · Cierre */}
      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-10">
        <Poem className="ml-[8%] opacity-90" />
        <p className="mt-12 text-center font-mono text-[11px] tracking-[0.2em] uppercase">
          • hecho con cariño •
        </p>
      </section>

      {creating && <ProjectDialog onClose={() => setCreating(false)} />}
    </main>
  );
}

/** Escritorio: carpetas (proyectos) y archivos (próximos posts) alrededor del título. */
function ProjectDesktop({ store, onCreate }: { store: State; onCreate: () => void }) {
  const today = todayKey();
  const files = store.posts
    .filter((p) => p.date && p.date >= today && p.format !== "Stories")
    .sort((a, b) => (a.date! < b.date! ? -1 : 1))
    .slice(0, 4);

  type Item = { key: string; node: ReactNode };
  const folders: Item[] = store.projects.map((p) => ({
    key: p.slug,
    node: (
      <Link href={`/proyecto/${p.slug}`} className="group flex flex-col items-center gap-1">
        <Folder className="h-16 w-20 transition group-hover:-translate-y-1" />
        <span className="rounded px-1 text-[13px] font-semibold group-hover:bg-[#2f6fd6] group-hover:text-white">
          {p.name.toLowerCase()}
        </span>
      </Link>
    ),
  }));
  const fileItems: Item[] = files.map((post) => {
    const project = store.projects.find((p) => p.slug === post.project)!;
    const ext = post.format.startsWith("Reel") ? "mov" : "jpg";
    return {
      key: post.id,
      node: (
        <Link href={`/proyecto/${post.project}`} className="group flex flex-col items-center gap-1.5">
          <div className="w-20 border-[3px] border-white shadow-md transition group-hover:-translate-y-1 group-hover:rotate-1">
            <FeedTile post={post} project={project} small />
          </div>
          <span className="max-w-28 truncate text-[12px] group-hover:bg-[#2f6fd6] group-hover:text-white">
            {slugify(post.title || "sin-titulo")}.{ext}
          </span>
          <span className="-mt-1 font-mono text-[10px] text-graphite uppercase">
            {shortDate(post.date!)}
          </span>
        </Link>
      ),
    };
  });
  const create: Item = {
    key: NEW,
    node: (
      <button onClick={onCreate} className="group flex flex-col items-center gap-1 opacity-70 hover:opacity-100">
        <Folder className="h-16 w-20 grayscale transition group-hover:-translate-y-1 group-hover:grayscale-0" />
        <span className="text-[13px]">nuevo proyecto</span>
      </button>
    ),
  };

  // Intercala carpetas y archivos para repartirlos alrededor del círculo.
  const items: Item[] = [];
  const rest = [...fileItems];
  for (const f of [...folders, create]) {
    items.push(f);
    const file = rest.shift();
    if (file) items.push(file);
  }
  items.push(...rest);

  return (
    <div className="relative mx-auto my-14 sm:aspect-square sm:w-[min(88vw,760px)]">
      <h1 className="relative z-10 py-6 text-center text-[clamp(52px,9vw,96px)] leading-[0.92] font-semibold tracking-[-0.06em] sm:absolute sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:py-0">
        Mis
        <br />
        <Selected>Proyectos</Selected>
      </h1>
      <div className="grid grid-cols-3 gap-6 sm:block">
        {items.map((item, i) => {
          const angle = -Math.PI / 2 + (i / items.length) * Math.PI * 2 + 0.25;
          return (
            <div
              key={item.key}
              className="flex justify-center sm:absolute sm:top-[var(--y)] sm:left-[var(--x)] sm:-translate-x-1/2 sm:-translate-y-1/2"
              style={
                {
                  "--x": `${50 + 41 * Math.cos(angle)}%`,
                  "--y": `${50 + 41 * Math.sin(angle)}%`,
                } as CSSProperties
              }
            >
              {item.node}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PLACEHOLDER: Project = {
  slug: NEW,
  name: "nuevo",
  instagram: "",
  bg: "#e6e6e6",
  accent: "#9a9a9a",
  monthlyGoal: 0,
  pillars: [],
};

/** Tarjeta plateada: esfera del proyecto elegido + rueda de proyectos. */
function ProjectPicker({ store, onCreate }: { store: State; onCreate: () => void }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  const items: WheelItem[] = [
    ...store.projects.map((p) => {
      const { count } = monthStats(p, store.posts);
      return { key: p.slug, label: p.name.toLowerCase(), hint: `${count}/${p.monthlyGoal} este mes` };
    }),
    { key: NEW, label: "+ nuevo proyecto", hint: "créalo" },
  ];
  const current = items[((index % items.length) + items.length) % items.length];
  const project = store.projects.find((p) => p.slug === current.key);
  const stats = project && monthStats(project, store.posts);

  const pick = (item: WheelItem) =>
    item.key === NEW ? onCreate() : router.push(`/proyecto/${item.key}`);

  return (
    <div className="silver relative grid -rotate-[0.8deg] items-center gap-6 overflow-hidden rounded-[28px] p-6 sm:grid-cols-[1fr_1.1fr] sm:p-10">
      <div className="flex flex-col items-start">
        <p className="font-mono text-[11px] tracking-[0.15em] text-graphite uppercase">
          ✳ este mes
        </p>
        <Orb project={project ?? PLACEHOLDER} className="mt-6 h-44 w-44 self-center sm:h-56 sm:w-56" />
        <p className="mt-8 text-[15px] font-medium">
          {project ? `Conoce el contenido de ${project.name}` : "Agrega un proyecto nuevo"}
        </p>
        <p className="text-[15px] text-graphite">
          {project
            ? project.instagram
              ? `@${project.instagram}`
              : "sin instagram todavía"
            : "con su calendario y su feed"}
        </p>
        <p className="mt-2 max-w-xs text-[12px] leading-relaxed text-graphite">
          {project && stats
            ? `${stats.count} de ${project.monthlyGoal} posts este mes. ${
                stats.next
                  ? `Próximo: ${stats.next.title || "sin título"}, ${shortDate(stats.next.date!)}.`
                  : "Nada programado todavía."
              }`
            : "Elige colores, meta mensual y categorías."}
        </p>
        <div className="mt-4 flex gap-2">
          {project ? (
            <>
              <Link href={`/proyecto/${project.slug}`} className={darkButtonClass}>
                Abrir calendario
              </Link>
              <Link href={`/proyecto/${project.slug}/feed`} className={buttonClass}>
                Ver feed
              </Link>
            </>
          ) : (
            <button onClick={onCreate} className={darkButtonClass}>
              Crear proyecto
            </button>
          )}
        </div>
      </div>
      <div>
        <WordWheel items={items} index={index} onChange={setIndex} onPick={pick} />
        <p className="-mt-4 text-center font-mono text-[10px] tracking-[0.15em] text-graphite uppercase">
          desliza ↕ · clic para abrir
        </p>
      </div>
    </div>
  );
}
