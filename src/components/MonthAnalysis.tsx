"use client";

import { useState } from "react";
import { shortDate } from "@/lib/dates";
import type { Post, Project } from "@/lib/types";
import { Logo } from "./Logo";
import { statusColor } from "./Status";


/** "Análisis mensual non negociable": meta del mes y cuántos posts lleva cada categoría. */
export function MonthAnalysis({
  project,
  posts,
  onEdit,
}: {
  project: Project;
  posts: Post[];
  onEdit: (post: Post) => void;
}) {
  const [showUncategorized, setShowUncategorized] = useState(false);
  const DONE = statusColor("listo", project);
  const feed = posts.filter((p) => p.format !== "Stories");
  const stories = posts.length - feed.length;
  const missing = Math.max(0, project.monthlyGoal - feed.length);
  const uncategorized = feed
    .filter((p) => !p.pillar)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));

  return (
    <aside className="silver self-start rounded-[24px] p-6">
      <div className="flex items-center gap-3">
        <Logo project={project} className="h-10 w-10 shrink-0" />
        <div>
          <p className="text-[15px] leading-tight font-medium">Análisis mensual</p>
          <p className="text-[13px] text-graphite">non negociable</p>
        </div>
      </div>

      <p className="mt-6 text-6xl leading-none font-light tracking-[-0.05em]">
        {feed.length}
        <span className="text-graphite/50">/{project.monthlyGoal}</span>
      </p>
      <p className="mt-2 text-[12px] text-graphite">
        {missing ? `Faltan ${missing} posts` : "Meta cumplida"}
        {stories > 0 && ` · ${stories} ${stories === 1 ? "story" : "stories"}`}
      </p>

      {project.pillars.length > 0 && (
        <ul className="mt-6 space-y-2.5 text-[13px]">
          {project.pillars.map((pillar) => {
            const count = posts.filter((p) => p.pillar === pillar.name).length;
            const done = count >= pillar.target;
            return (
              <li key={pillar.name} className="flex items-baseline gap-2">
                <span className={done ? "" : "text-ink/80"}>
                  {pillar.target} {pillar.name}
                </span>
                <span className="flex-1 translate-y-[-3px] border-b border-dotted border-ink/40" />
                <span className={done ? "font-bold" : "font-bold text-graphite"}>
                  {count}/{pillar.target}
                </span>
                <span
                  className="h-[7px] w-[7px] translate-y-[-1px] rounded-full border border-ink/50"
                  style={{ background: done ? DONE : "transparent", borderColor: done ? DONE : undefined }}
                />
              </li>
            );
          })}
        </ul>
      )}
      {uncategorized.length > 0 && (
        <div className="mt-4 text-[12px]">
          <button
            onClick={() => setShowUncategorized((v) => !v)}
            className="flex items-center gap-1 text-graphite hover:text-ink"
            aria-expanded={showUncategorized}
          >
            {uncategorized.length} sin categoría
            <span className={`transition ${showUncategorized ? "rotate-90" : ""}`}>›</span>
          </button>
          {showUncategorized && (
            <ul className="mt-2 space-y-1">
              {uncategorized.map((post) => (
                <li key={post.id}>
                  <button
                    onClick={() => onEdit(post)}
                    className="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white"
                  >
                    <span className="w-12 shrink-0 text-graphite">{shortDate(post.date!)}</span>
                    <span className="flex-1 font-medium">{post.title || "Sin título"}</span>
                    <span className="text-graphite">Asignar ›</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}
