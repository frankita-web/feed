"use client";

import Link from "next/link";
import { useState } from "react";
import { MONTHS, monthKey, shortDate, todayKey } from "@/lib/dates";
import { useStore } from "@/lib/store";
import type { Post, Project } from "@/lib/types";
import { Bow } from "./Bow";
import { FeedTile, feedPosts } from "./FeedTile";
import { ProjectDialog } from "./ProjectDialog";

export function ProjectsHome() {
  const store = useStore();
  const [creating, setCreating] = useState(false);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14 sm:px-8 sm:py-20">
      <header className="mb-14 text-center">
        <Bow className="mx-auto h-10 w-16" />
        <p className="mt-4 h-4 text-[11px] font-medium tracking-[0.35em] text-mauve uppercase">
          {/* La fecha se lee solo en el navegador (store !== null) */}
          {store && `contenido · ${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`}
        </p>
        <h1 className="mt-3 font-display text-6xl leading-none font-medium italic sm:text-7xl">
          mis proyectos
        </h1>
        <p className="mt-3 font-script text-3xl text-rose">franca mandiola estudio</p>
      </header>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {store
          ? store.projects.map((project) => (
              <ProjectCard
                key={project.slug}
                project={project}
                posts={store.posts.filter((p) => p.project === project.slug)}
              />
            ))
          : [0, 1, 2].map((i) => (
              <div key={i} className="h-96 animate-pulse rounded-[36px] bg-blush" />
            ))}
        {store && (
          <button
            onClick={() => setCreating(true)}
            className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-[36px] border-2 border-dashed border-petal bg-white/50 text-mauve transition hover:border-rose hover:bg-white/80 hover:text-ink"
          >
            <span className="text-3xl leading-none">+</span>
            <span className="font-display text-2xl italic">nuevo proyecto</span>
          </button>
        )}
      </div>

      <footer className="mt-20 text-center font-display text-lg text-mauve italic">
        hecho con cariño ♡
      </footer>

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
      className="group relative flex flex-col rounded-[36px] p-6 pt-8 shadow-[0_18px_40px_-24px_rgb(150_70_95/0.5)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_50px_-24px_rgb(150_70_95/0.6)]"
      style={{ background: project.bg }}
    >
      <Bow
        color="#fffaf6"
        className="absolute -top-5 left-1/2 h-10 w-16 -translate-x-1/2 drop-shadow-sm transition group-hover:rotate-[-6deg]"
      />

      <div className="text-center">
        <h2
          className="font-display text-5xl leading-none font-medium italic"
          style={{ color: project.accent }}
        >
          {project.name.toLowerCase()}
        </h2>
        <p className="mt-1.5 h-5 text-xs tracking-[0.2em] text-ink/60">
          {project.instagram && `@${project.instagram}`}
        </p>
      </div>

      <div className="mt-5 rounded-[20px] bg-white p-2 shadow-sm">
        <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-[14px]">
          {preview.length ? (
            preview.map((p) => <FeedTile key={p.id} post={p} project={project} small />)
          ) : (
            <div className="col-span-3 flex aspect-[3/1] items-center justify-center font-display text-lg text-mauve italic">
              aún no hay publicaciones
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-[20px] bg-white/75 px-4 py-3.5 text-sm">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-lg italic">este mes</span>
          <span className="text-xs font-medium tracking-wide" style={{ color: project.accent }}>
            {thisMonth.length} / {project.monthlyGoal} posts
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress * 100}%`, background: project.accent }}
          />
        </div>
        <p className="mt-3 truncate text-xs text-ink/70">
          {next ? (
            <>
              próximo ♡ <span className="font-medium text-ink">{next.title || "Sin título"}</span>{" "}
              · {shortDate(next.date!)}
            </>
          ) : (
            "nada programado todavía"
          )}
        </p>
      </div>
    </Link>
  );
}
