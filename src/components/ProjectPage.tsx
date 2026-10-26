"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Bow } from "./Bow";
import { CalendarView } from "./CalendarView";
import { FeedView } from "./FeedView";
import { buttonClass } from "./Modal";
import { ProjectDialog } from "./ProjectDialog";

export type Tab = "calendario" | "feed";

export function ProjectPage({ slug, tab }: { slug: string; tab: Tab }) {
  const store = useStore();
  const [settings, setSettings] = useState(false);

  if (!store) return <div className="flex-1 animate-pulse bg-blush/50" />;

  const project = store.projects.find((p) => p.slug === slug);
  if (!project)
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <Bow className="h-10 w-16" />
        <p className="font-display text-3xl italic">este proyecto no existe</p>
        <Link href="/" className="text-sm text-mauve underline">
          volver a mis proyectos
        </Link>
      </main>
    );

  const posts = store.posts.filter((p) => p.project === slug);
  const tabs: { id: Tab; label: string; href: string }[] = [
    { id: "calendario", label: "calendario", href: `/proyecto/${slug}` },
    { id: "feed", label: "feed", href: `/proyecto/${slug}/feed` },
  ];

  return (
    <div
      className="flex-1"
      style={{
        backgroundColor: "var(--color-cream)",
        backgroundImage: `radial-gradient(${project.bg} 1.4px, transparent 1.5px), linear-gradient(${project.bg}66, transparent 420px)`,
        backgroundSize: "22px 22px, 100% 100%",
      }}
    >
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 pt-7 sm:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className={buttonClass}>
            ← proyectos
          </Link>
          <div className="flex items-center gap-2">
            <Bow color={project.bg} className="h-7 w-11" />
            <div>
              <h1
                className="font-display text-4xl leading-none font-medium italic"
                style={{ color: project.accent }}
              >
                {project.name.toLowerCase()}
              </h1>
              {project.instagram && (
                <a
                  href={`https://www.instagram.com/${project.instagram}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs tracking-[0.15em] text-mauve hover:text-ink"
                >
                  @{project.instagram}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex rounded-full border border-petal bg-white/80 p-1">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={t.href}
                className="rounded-full px-5 py-1.5 font-display text-lg leading-tight italic transition"
                style={
                  t.id === tab
                    ? { background: project.accent, color: "white" }
                    : { color: "var(--color-mauve)" }
                }
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <button onClick={() => setSettings(true)} className={buttonClass}>
            ajustes
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
