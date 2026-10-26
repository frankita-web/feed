import type { Post, Project } from "@/lib/types";
import { Orb } from "./Typo";

const DONE = "#3d7a5c";

/** "Análisis mensual non negociable": meta del mes y cuántos posts lleva cada categoría. */
export function MonthAnalysis({ project, posts }: { project: Project; posts: Post[] }) {
  const feed = posts.filter((p) => p.format !== "Stories");
  const stories = posts.length - feed.length;
  const missing = Math.max(0, project.monthlyGoal - feed.length);
  const uncategorized = feed.filter((p) => !p.pillar).length;

  return (
    <aside className="silver self-start rounded-[24px] p-6 xl:rotate-[0.6deg]">
      <div className="flex items-center gap-3">
        <Orb project={project} className="h-10 w-10 shrink-0" />
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
        <ul className="mt-6 space-y-2.5 font-mono text-[12px] uppercase">
          {project.pillars.map((pillar) => {
            const count = posts.filter((p) => p.pillar === pillar.name).length;
            const done = count >= pillar.target;
            return (
              <li key={pillar.name} className="flex items-baseline gap-2">
                <span className={done ? "" : "text-ink/80"}>
                  {pillar.target} {pillar.name}
                </span>
                <span className="flex-1 translate-y-[-3px] border-b border-dotted border-ink/40" />
                <span className="font-bold" style={{ color: done ? DONE : undefined }}>
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
      {uncategorized > 0 && (
        <p className="mt-4 font-mono text-[10px] tracking-wider text-graphite uppercase">
          • {uncategorized} sin categoría
        </p>
      )}
    </aside>
  );
}
