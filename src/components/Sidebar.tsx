"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { todayKey, weekRange } from "@/lib/dates";
import type { Post, Project } from "@/lib/types";
import { ProjectDialog } from "./ProjectDialog";

export type Tab = "calendario" | "feed" | "drinks";

export const TAB_LABEL: Record<Tab, string> = {
  calendario: "Calendario",
  feed: "Feed",
  drinks: "Drinks",
};

export function tabHref(slug: string, tab: Tab) {
  return tab === "calendario" ? `/proyecto/${slug}` : `/proyecto/${slug}/${tab}`;
}

/** Blanco o negro, según qué se lea mejor sobre `hex`. */
function textOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#161616" : "#ffffff";
}

/** Cuadrito del cliente: iniciales sobre su color principal. */
export function ClientTile({ project, size = "h-7 w-7" }: { project: Project; size?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold uppercase ring-1 ring-black/10 ${size}`}
      style={{ background: project.accent, color: textOn(project.accent) }}
    >
      {project.name.slice(0, 2)}
    </span>
  );
}

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    className="h-[18px] w-[18px] shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const TAB_ICON: Record<Tab | "ajustes" | "inicio", ReactNode> = {
  inicio: (
    <Icon>
      <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />
    </Icon>
  ),
  calendario: (
    <Icon>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Icon>
  ),
  feed: (
    <Icon>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" />
    </Icon>
  ),
  drinks: (
    <Icon>
      <path d="M5 4h14l-7 8zM12 12v8M8 20h8" />
    </Icon>
  ),
  ajustes: (
    <Icon>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </Icon>
  ),
};

// Barra colapsada: se recuerda en el navegador.
const COLLAPSED = "feed-planner:sidebar-collapsed";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
function useCollapsed() {
  const collapsed = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(COLLAPSED) === "1",
    () => false,
  );
  const toggle = () => {
    localStorage.setItem(COLLAPSED, collapsed ? "0" : "1");
    window.dispatchEvent(new StorageEvent("storage", { key: COLLAPSED }));
  };
  return [collapsed, toggle] as const;
}

const itemClass = (active: boolean) =>
  `flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition ${
    active
      ? "bg-black/[0.06] font-medium text-ink"
      : "text-ink/75 hover:bg-black/[0.04] hover:text-ink"
  }`;

/** Menú lateral claro: proyecto actual, sus secciones y la lista de clientes. */
export function Sidebar({
  projects,
  project,
  posts,
  tab,
  onSettings,
}: {
  projects: Project[];
  project: Project;
  posts: Post[];
  tab: Tab;
  onSettings: () => void;
}) {
  const [collapsed, toggleCollapsed] = useCollapsed();
  const [creating, setCreating] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!switcher) return;
    const close = (e: MouseEvent) => {
      if (!switcherRef.current?.contains(e.target as Node)) setSwitcher(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [switcher]);

  const [from, to] = weekRange();
  const today = todayKey();
  const pending = (p: Post) => p.status !== "publicado";
  const thisWeek = posts.filter((p) => p.date && p.date >= from && p.date <= to && pending(p));
  const overdue = posts.filter((p) => p.date && p.date < today && pending(p)).length;

  const tabs: Tab[] = ["calendario", "feed", ...(project.drinks ? (["drinks"] as const) : [])];
  const badges: Partial<Record<Tab, number>> = { calendario: thisWeek.length || undefined };

  return (
    <>
      {/* Escritorio */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-black/[0.06] bg-white/45 px-3 py-4 backdrop-blur md:flex ${
          collapsed ? "w-[68px]" : "w-[244px]"
        }`}
      >
        <div className="flex items-center gap-1">
          <div ref={switcherRef} className="relative min-w-0 flex-1">
            <button
              onClick={() => setSwitcher((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-black/[0.04]"
              aria-haspopup="menu"
              aria-expanded={switcher}
            >
              <ClientTile project={project} size="h-8 w-8" />
              {!collapsed && (
                <>
                  <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                    {project.name}
                  </span>
                  <span className="text-[11px] text-graphite">⌄</span>
                </>
              )}
            </button>
            {switcher && (
              <div
                role="menu"
                className="silver absolute top-full left-0 z-40 mt-1 w-56 rounded-2xl p-1.5"
              >
                {projects.map((p) => (
                  <Link
                    key={p.slug}
                    href={tabHref(p.slug, tab === "drinks" && !p.drinks ? "calendario" : tab)}
                    onClick={() => setSwitcher(false)}
                    className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[14px] hover:bg-black/[0.05]"
                  >
                    <ClientTile project={p} />
                    <span className="flex-1">{p.name}</span>
                    {p.slug === project.slug && <span className="text-[12px]">✓</span>}
                  </Link>
                ))}
                <div className="my-1 border-t border-black/10" />
                <button
                  onClick={() => {
                    setSwitcher(false);
                    setCreating(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-[14px] text-graphite hover:bg-black/[0.05] hover:text-ink"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-black/20">
                    +
                  </span>
                  Nuevo proyecto
                </button>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              className="rounded-lg p-1.5 text-graphite hover:bg-black/[0.04] hover:text-ink"
              aria-label="Colapsar menú"
              title="Colapsar menú"
            >
              <Icon>
                <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
                <path d="M9.5 4.5v15" />
              </Icon>
            </button>
          )}
        </div>

        <nav className="mt-6 space-y-0.5">
          <Link href="/" className={itemClass(false)} title="Inicio">
            {TAB_ICON.inicio}
            {!collapsed && "Inicio"}
          </Link>
          {tabs.map((t) => (
            <Link
              key={t}
              href={tabHref(project.slug, t)}
              className={itemClass(tab === t)}
              title={TAB_LABEL[t]}
            >
              {TAB_ICON[t]}
              {!collapsed && (
                <>
                  <span className="flex-1">{TAB_LABEL[t]}</span>
                  {badges[t] && (
                    <span className="rounded-md bg-black/[0.06] px-1.5 text-[11px] text-graphite">
                      {badges[t]}
                    </span>
                  )}
                </>
              )}
            </Link>
          ))}
          <button onClick={onSettings} className={`${itemClass(false)} w-full`} title="Ajustes">
            {TAB_ICON.ajustes}
            {!collapsed && "Ajustes"}
          </button>
        </nav>

        {!collapsed && overdue > 0 && (
          <p className="mt-3 px-3 text-[12px] text-graphite">
            {overdue} {overdue === 1 ? "publicación atrasada" : "publicaciones atrasadas"}
          </p>
        )}

        <p className={`mt-7 mb-1.5 px-3 text-[12px] text-graphite ${collapsed ? "sr-only" : ""}`}>
          Clientes
        </p>
        <nav className="space-y-0.5">
          {projects.map((p) => (
            <Link
              key={p.slug}
              href={tabHref(p.slug, tab === "drinks" && !p.drinks ? "calendario" : tab)}
              className={itemClass(p.slug === project.slug)}
              title={p.name}
            >
              <ClientTile project={p} size="h-6 w-6" />
              {!collapsed && (
                <span className="min-w-0 truncate">{p.instagram ? `@${p.instagram}` : p.name}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          {collapsed ? (
            <button
              onClick={toggleCollapsed}
              className="mx-auto flex rounded-lg p-1.5 text-graphite hover:bg-black/[0.04] hover:text-ink"
              aria-label="Expandir menú"
              title="Expandir menú"
            >
              <Icon>
                <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
                <path d="M9.5 4.5v15" />
              </Icon>
            </button>
          ) : (
            <Link href="/" className="px-3 text-[12px] text-graphite hover:text-ink">
              Franca Mandiola Estudio
            </Link>
          )}
        </div>
      </aside>

      {/* Celular */}
      <div className="sticky top-0 z-30 border-b border-black/[0.06] bg-paper/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Link href="/" className="shrink-0 rounded-lg p-1.5 text-graphite" aria-label="Inicio">
            {TAB_ICON.inicio}
          </Link>
          {projects.map((p) => (
            <Link
              key={p.slug}
              href={tabHref(p.slug, tab === "drinks" && !p.drinks ? "calendario" : tab)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] ${
                p.slug === project.slug ? "bg-white font-medium shadow-sm" : "text-ink/70"
              }`}
            >
              <ClientTile project={p} size="h-5 w-5" />
              {p.name}
            </Link>
          ))}
        </div>
        <nav className="mt-2.5 flex gap-1 text-[13px]">
          {tabs.map((t) => (
            <Link
              key={t}
              href={tabHref(project.slug, t)}
              className={`rounded-full px-3 py-1.5 ${
                tab === t ? "bg-ink font-medium text-white" : "text-ink/70"
              }`}
            >
              {TAB_LABEL[t]}
            </Link>
          ))}
          <button onClick={onSettings} className="rounded-full px-3 py-1.5 text-ink/70">
            Ajustes
          </button>
        </nav>
      </div>

      {creating && <ProjectDialog onClose={() => setCreating(false)} />}
    </>
  );
}
