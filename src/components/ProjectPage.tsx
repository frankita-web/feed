"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { CalendarView } from "./CalendarView";
import { FeedView } from "./FeedView";
import { ProjectDialog } from "./ProjectDialog";

export type Tab = "calendario" | "feed";

export function ProjectPage({ slug, tab }: { slug: string; tab: Tab }) {
  const store = useStore();
  const [settings, setSettings] = useState(false);

  if (!store) return <div className="flex-1 animate-pulse bg-neutral-100" />;

  const project = store.projects.find((p) => p.slug === slug);
  if (!project)
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg">Este proyecto no existe.</p>
        <Link href="/" className="font-semibold underline">
          Volver a mis proyectos
        </Link>
      </main>
    );

  const posts = store.posts.filter((p) => p.project === slug);
  const tabs: { id: Tab; label: string; href: string }[] = [
    { id: "calendario", label: "Calendario", href: `/proyecto/${slug}` },
    { id: "feed", label: "Feed", href: `/proyecto/${slug}/feed` },
  ];

  return (
    <div className="flex-1" style={{ background: project.bg }}>
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 pt-6 sm:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="rounded-full bg-white/70 px-3 py-1.5 text-sm font-medium hover:bg-white"
          >
            ← Proyectos
          </Link>
          <div>
            <h1
              className="text-3xl leading-none font-black tracking-tight"
              style={{ color: project.accent }}
            >
              {project.name}
            </h1>
            {project.instagram && (
              <a
                href={`https://www.instagram.com/${project.instagram}/`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-neutral-700 hover:underline"
              >
                @{project.instagram}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex rounded-full bg-white/70 p-1">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={t.href}
                className="rounded-full px-4 py-1.5 text-sm font-semibold transition"
                style={
                  t.id === tab
                    ? { background: project.accent, color: "white" }
                    : { color: "#404040" }
                }
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => setSettings(true)}
            className="rounded-full bg-white/70 px-3 py-1.5 text-sm font-medium hover:bg-white"
          >
            Ajustes
          </button>
        </div>
      </header>

      {tab === "calendario" ? (
        <CalendarView project={project} posts={posts} notes={store.notes} />
      ) : (
        <FeedView project={project} posts={posts} />
      )}

      {settings && <ProjectDialog project={project} onClose={() => setSettings(false)} />}
    </div>
  );
}
