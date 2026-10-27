"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { MONTHS, parseKey, shortDate, todayKey, weekRange, weekdayOf } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { STATUS_LABEL, type Project, type State } from "@/lib/types";
import { Folder, Selected } from "./Desktop";
import { buttonClass, darkButtonClass } from "./Modal";
import { Orb, Swatches } from "./Orb";
import { ProjectDialog } from "./ProjectDialog";
import { statusColor } from "./PostDialog";
import { WordWheel } from "./WordWheel";

export function ProjectsHome() {
  const store = useStore();
  const [creating, setCreating] = useState(false);

  return (
    <main className="relative flex-1 overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 pt-8 sm:px-10">
        <header className="flex items-baseline justify-between gap-4 text-[13px]">
          <span className="font-semibold tracking-[-0.01em]">Franca Mandiola Estudio</span>
          <span className="text-graphite">
            {store &&
              `${new Date().getDate()} ${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`}
          </span>
        </header>

        {store && (
          <section className="silver mt-6 mb-12 overflow-hidden rounded-[28px] p-6 sm:p-10">
            <div className="flex flex-wrap items-end justify-between gap-8">
              <h1 className="text-[clamp(44px,7vw,80px)] leading-[0.92] font-semibold tracking-[-0.06em]">
                Mis
                <br />
                <Selected>Proyectos</Selected>
              </h1>
              <ProjectFolders store={store} onCreate={() => setCreating(true)} />
            </div>
            <div className="my-8 border-t border-black/10" />
            <WeekNotice store={store} />
          </section>
        )}

        <p className="pb-12 text-center text-[12px] text-graphite">hecho con cariño</p>
      </div>

      {creating && <ProjectDialog onClose={() => setCreating(false)} />}
    </main>
  );
}

const NEUTRAL: Project = {
  slug: "",
  name: "",
  instagram: "",
  bg: "#e4e4e4",
  accent: "#a8a8a8",
  monthlyGoal: 0,
  pillars: [],
};

/** Aviso: lo que falta subir esta semana, de todos los proyectos. */
function WeekNotice({ store }: { store: State }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [from, to] = weekRange();

  const due = store.posts
    .filter((p) => p.date && p.date >= from && p.date <= to && p.status !== "publicado")
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date! < b.date! ? -1 : 1));
  const projectOf = (slug: string) => store.projects.find((p) => p.slug === slug) ?? NEUTRAL;

  const selected = due[Math.min(index, due.length - 1)];
  const project = selected ? projectOf(selected.project) : NEUTRAL;
  const day = (key: string) => `${weekdayOf(key).toLowerCase()} ${parseKey(key).day}`;

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col items-start">
        <p className="flex items-center gap-2 text-[12px] font-medium tracking-[0.08em] uppercase">
          <span className="pulse-dot h-2 w-2 rounded-full" style={{ background: project.accent }} />
          Esta semana · {shortDate(from)} – {shortDate(to)}
        </p>
        <Orb project={project} className="mt-6 h-40 w-40 self-center sm:h-52 sm:w-52" />

        {selected ? (
          <>
            <p className="mt-8 text-[15px] font-medium">
              {due.length === 1
                ? "Esta semana toca subir 1 publicación"
                : `Esta semana toca subir ${due.length} publicaciones`}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
              {selected.title || "Sin título"}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-graphite">
              <span>{project.name}</span>·<span>{day(selected.date!)}</span>·
              <span>{selected.format}</span>·
              <span className="flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: statusColor(selected.status, project) }}
                />
                {STATUS_LABEL[selected.status]}
                {selected.date! < todayKey() && " (atrasado)"}
              </span>
            </p>
            <div className="mt-5 flex gap-2">
              <Link href={`/proyecto/${project.slug}`} className={darkButtonClass}>
                Abrir calendario
              </Link>
              <Link href={`/proyecto/${project.slug}/feed`} className={buttonClass}>
                Ver feed
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-8 text-2xl font-semibold tracking-[-0.03em]">
              Nada pendiente esta semana
            </p>
            <p className="mt-1 text-[13px] text-graphite">
              Todo lo de estos días ya está publicado.
            </p>
          </>
        )}
      </div>

      {due.length > 0 && (
        <div>
          <WordWheel
            label="Publicaciones de esta semana"
            loop={false}
            items={due.map((p) => ({
              key: p.id,
              label: (p.title || "sin título").toLowerCase(),
              hint: `${day(p.date!)} · ${projectOf(p.project).name.toLowerCase()}`,
            }))}
            index={Math.min(index, due.length - 1)}
            onChange={setIndex}
            onPick={(item) => {
              const post = due.find((p) => p.id === item.key);
              if (post) router.push(`/proyecto/${post.project}`);
            }}
          />
          <p className="mt-3 text-center text-[11px] text-graphite">
            Desliza para ver cada una · clic para abrir
          </p>
        </div>
      )}
    </div>
  );
}

/** Carpetas de los proyectos, en fila. */
function ProjectFolders({ store, onCreate }: { store: State; onCreate: () => void }) {
  type Item = { key: string; node: ReactNode };
  const items: Item[] = [
    ...store.projects.map((p) => ({
      key: p.slug,
      node: (
        <Link href={`/proyecto/${p.slug}`} className="group flex flex-col items-center gap-1">
          <Folder className="h-20 w-24 transition group-hover:-translate-y-1" />
          <span className="rounded px-1 text-[14px] font-semibold group-hover:bg-[#2f6fd6] group-hover:text-white">
            {p.name.toLowerCase()}
          </span>
          <Swatches project={p} className="mt-0.5" />
        </Link>
      ),
    })),
    {
      key: "__nuevo__",
      node: (
        <button
          onClick={onCreate}
          className="group flex flex-col items-center gap-1 opacity-70 hover:opacity-100"
        >
          <Folder className="h-20 w-24 grayscale transition group-hover:-translate-y-1 group-hover:grayscale-0" />
          <span className="text-[14px]">nuevo proyecto</span>
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-6">
      {items.map((item) => (
        <div key={item.key}>{item.node}</div>
      ))}
    </div>
  );
}
