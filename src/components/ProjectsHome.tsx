"use client";

import Link from "next/link";
import { useState } from "react";
import { MONTHS, monthKey, shortDate, todayKey } from "@/lib/dates";
import { useStore } from "@/lib/store";
import type { Post, Project } from "@/lib/types";
import { FeedTile, feedPosts } from "./FeedTile";
import { ProjectDialog } from "./ProjectDialog";

export function ProjectsHome() {
  const store = useStore();
  const [creating, setCreating] = useState(false);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="h-5 text-sm font-semibold tracking-[0.2em] text-neutral-400 uppercase">
            {/* La fecha se lee solo en el navegador (store !== null) */}
            {store && `Contenido · ${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`}
          </p>
          <h1 className="mt-2 text-5xl font-black tracking-tight sm:text-6xl">Mis proyectos</h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          + Nuevo proyecto
        </button>
      </header>

      {store ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {store.projects.map((project) => (
            <ProjectCard
              key={project.slug}
              project={project}
              posts={store.posts.filter((p) => p.project === project.slug)}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-3xl bg-neutral-100" />
          ))}
        </div>
      )}

      {creating && <ProjectDialog onClose={() => setCreating(false)} />}
    </main>
  );
}

function ProjectCard({ project, posts }: { project: Project; posts: Post[] }) {
  const now = new Date();
  const month = monthKey(now.getFullYear(), now.getMonth());
  const today = todayKey();
  const thisMonth = posts.filter((p) => p.date?.startsWith(month) && p.format !== "Stories");
  const next = posts
    .filter((p) => p.date && p.date >= today)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1))[0];
  const preview = feedPosts(posts, project.slug).slice(0, 6);
  const progress = project.monthlyGoal ? Math.min(1, thisMonth.length / project.monthlyGoal) : 0;

  return (
    <Link
      href={`/proyecto/${project.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl p-5 transition hover:-translate-y-1 hover:shadow-xl"
      style={{ background: project.bg }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-black tracking-tight" style={{ color: project.accent }}>
            {project.name}
          </h2>
          {project.instagram && (
            <p className="text-sm text-neutral-700">@{project.instagram}</p>
          )}
        </div>
        <span
          className="rounded-full bg-white px-3 py-1 text-xs font-semibold transition group-hover:translate-x-0.5"
          style={{ color: project.accent }}
        >
          Abrir →
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-0.5 overflow-hidden rounded-xl bg-white/60">
        {preview.length ? (
          preview.map((p) => <FeedTile key={p.id} post={p} project={project} small />)
        ) : (
          <div className="col-span-3 flex aspect-[3/1] items-center justify-center text-xs text-neutral-500">
            Aún no hay publicaciones
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl bg-white/80 p-4 text-sm">
        <div className="flex justify-between font-semibold">
          <span>Este mes</span>
          <span style={{ color: project.accent }}>
            {thisMonth.length} / {project.monthlyGoal} posts
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress * 100}%`, background: project.accent }}
          />
        </div>
        <p className="mt-3 truncate text-neutral-600">
          {next ? (
            <>
              Próximo: <b className="text-neutral-900">{next.title || "Sin título"}</b> ·{" "}
              {shortDate(next.date!)}
            </>
          ) : (
            "Nada programado todavía"
          )}
        </p>
      </div>
    </Link>
  );
}
