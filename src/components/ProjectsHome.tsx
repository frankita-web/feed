"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MONTHS, parseKey, shortDate, todayKey, weekRange, weekdayOf } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { STATUS_LABEL, type Project, type State } from "@/lib/types";
import { Folder } from "./Desktop";
import { buttonClass, darkButtonClass } from "./Modal";
import { Logo } from "./Logo";
import { ProjectDialog } from "./ProjectDialog";
import { StatusDot } from "./Status";
import { WordWheel } from "./WordWheel";

export function ProjectsHome() {
  const store = useStore();
  const [creating, setCreating] = useState(false);

  return (
    <main className="flex flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-black/[0.06] bg-white/45 px-4 py-5 backdrop-blur md:sticky md:top-0 md:h-screen md:w-[220px] md:border-r md:border-b-0">
        <span className="px-2 text-[14px] font-semibold tracking-[-0.01em]">
          Franca Mandiola Estudio
        </span>
        <p className="mt-6 mb-1.5 px-2 text-[12px] text-graphite">Proyectos</p>
        {store && <ProjectList store={store} onCreate={() => setCreating(true)} />}
        <p className="mt-auto hidden px-2 text-[11px] text-graphite md:block">hecho con cariño</p>
      </aside>

      <section className="min-w-0 flex-1 px-5 py-6 sm:px-10 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <header className="flex items-baseline justify-between gap-4">
            <h1 className="text-[clamp(22px,2.4vw,28px)] font-semibold tracking-[-0.03em]">
              Esta semana
            </h1>
            <span className="text-[13px] text-graphite">
              {store &&
                `${new Date().getDate()} ${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`}
            </span>
          </header>
          {store && (
            <div className="silver mt-5 overflow-hidden rounded-[28px] p-6 sm:p-10">
              <WeekNotice store={store} />
            </div>
          )}
        </div>
      </section>

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
          {shortDate(from)} – {shortDate(to)}
        </p>
        <Logo project={project} className="mt-6 h-40 w-40 self-center sm:h-52 sm:w-52" />

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
                <StatusDot status={selected.status} project={project} className="h-1.5 w-1.5" />
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

/** Proyectos en lista chica, con carpetita. */
function ProjectList({ store, onCreate }: { store: State; onCreate: () => void }) {
  const [from, to] = weekRange();
  const dueOf = (slug: string) =>
    store.posts.filter(
      (p) =>
        p.project === slug && p.date && p.date >= from && p.date <= to && p.status !== "publicado",
    ).length;

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {store.projects.map((p) => {
        const due = dueOf(p.slug);
        return (
          <Link
            key={p.slug}
            href={`/proyecto/${p.slug}`}
            className="flex shrink-0 items-center gap-2.5 rounded-xl px-2 py-1.5 text-[14px] transition hover:bg-black/[0.05]"
          >
            <Folder className="h-5 w-6" />
            <span className="flex-1">{p.name}</span>
            {due > 0 && (
              <span className="rounded-md bg-black/[0.06] px-1.5 text-[11px] text-graphite">
                {due}
              </span>
            )}
          </Link>
        );
      })}
      <button
        onClick={onCreate}
        className="flex shrink-0 items-center gap-2.5 rounded-xl px-2 py-1.5 text-[14px] text-graphite transition hover:bg-black/[0.05] hover:text-ink"
      >
        <Folder className="h-5 w-6 grayscale" />
        Nuevo proyecto
      </button>
    </nav>
  );
}
