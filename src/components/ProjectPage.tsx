"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { CalendarView } from "./CalendarView";
import { DrinksView } from "./DrinksView";
import { FeedView } from "./FeedView";
import { GuionesView } from "./GuionesView";
import { IdeasView } from "./IdeasView";
import { MenuView } from "./MenuView";
import { ShootsView } from "./ShootsView";
import { ProjectDialog } from "./ProjectDialog";
import { Sidebar, TAB_ICON, TAB_LABEL, tabsFor, type Tab } from "./Sidebar";

export type { Tab };

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

  // Sección que este proyecto no tiene (p. ej. Drinks en Issi): vuelve al calendario.
  if (!tabsFor(project).includes(tab)) tab = "calendario";
  const posts = store.posts.filter((p) => p.project === slug);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar
        projects={store.projects}
        project={project}
        posts={posts}
        tab={tab}
        onSettings={() => setSettings(true)}
      />

      <main className="min-w-0 flex-1">
        <header className="mx-auto flex max-w-7xl flex-wrap items-center gap-2.5 px-4 pt-7 text-[clamp(20px,2.2vw,26px)] tracking-[-0.03em] sm:px-8">
          <h1 className="text-graphite">{project.name}</h1>
          <span className="text-graphite/50">/</span>
          <span className="flex items-center gap-2 font-semibold [&_svg]:h-[1em] [&_svg]:w-[1em]">
            {TAB_ICON[tab]}
            {TAB_LABEL[tab]}
          </span>
          {project.instagram && (
            <a
              href={`https://www.instagram.com/${project.instagram}/`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-[13px] tracking-normal text-graphite hover:text-ink"
            >
              @{project.instagram} ↗
            </a>
          )}
        </header>

        {tab === "calendario" ? (
          <CalendarView project={project} posts={posts} notes={store.notes} />
        ) : tab === "feed" ? (
          <FeedView project={project} posts={posts} shoots={store.shoots} bank={store.bank} />
        ) : tab === "guiones" ? (
          <GuionesView project={project} posts={posts} scripts={store.scripts ?? []} />
        ) : tab === "ideas" ? (
          <IdeasView project={project} ideas={store.ideas ?? []} shoots={store.shoots ?? []} />
        ) : tab === "entregables" ? (
          <ShootsView
            project={project}
            posts={posts}
            shoots={store.shoots ?? []}
            ideas={store.ideas ?? []}
            scripts={store.scripts ?? []}
          />
        ) : tab === "menu" ? (
          <MenuView project={project} />
        ) : (
          <DrinksView project={project} posts={posts} />
        )}
      </main>

      {settings && <ProjectDialog project={project} onClose={() => setSettings(false)} />}
    </div>
  );
}
