"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { CalendarView } from "./CalendarView";
import { Selected } from "./Desktop";
import { FeedView } from "./FeedView";
import { buttonClass } from "./Modal";
import { ProjectDialog } from "./ProjectDialog";
import { Orb } from "./Orb";

export type Tab = "calendario" | "feed";

export function ProjectPage({ slug, tab }: { slug: string; tab: Tab }) {
  const store = useStore();
  const [settings, setSettings] = useState(false);

  if (!store) return <div className="flex-1" />;

  const project = store.projects.find((p) => p.slug === slug);
  if (!project)
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p>este proyecto no existe</p>
        <Link href="/" className="text-xs underline">
          volver a mis proyectos
        </Link>
      </main>
    );

  const posts = store.posts.filter((p) => p.project === slug);
  const tabs: { id: Tab; label: string; href: string }[] = [
    { id: "calendario", label: "Calendario", href: `/proyecto/${slug}` },
    { id: "feed", label: "Feed", href: `/proyecto/${slug}/feed` },
  ];

  return (
    <div className="flex-1">
      <header className="relative mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-4 pt-7 sm:px-8">
        <div>
          <Link href="/" className="text-[13px] text-graphite hover:text-ink">
            ← Mis proyectos
          </Link>
          <div className="mt-4 flex items-center gap-5">
            <Orb project={project} className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
            <div>
              <h1 className="text-[clamp(40px,6vw,64px)] leading-[0.95] font-semibold tracking-[-0.055em]">
                <Selected cursor={false}>{project.name}</Selected>
              </h1>
              {project.instagram && (
                <a
                  href={`https://www.instagram.com/${project.instagram}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-[13px] text-graphite hover:text-ink"
                >
                  @{project.instagram}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex rounded-full border border-black/10 bg-white/50 p-1 backdrop-blur">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={t.href}
                className={`rounded-full px-4 py-1.5 text-[13px] transition ${
                  t.id === tab ? "bg-ink font-medium text-white" : "text-ink hover:bg-white/70"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <button onClick={() => setSettings(true)} className={buttonClass}>
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
