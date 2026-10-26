import type { Post, Project } from "@/lib/types";
import { Bow } from "./Bow";

const DONE = "#6a9f78";

/** "Análisis mensual non negociable": meta del mes y cuántos posts lleva cada categoría. */
export function MonthAnalysis({ project, posts }: { project: Project; posts: Post[] }) {
  const feed = posts.filter((p) => p.format !== "Stories");
  const stories = posts.length - feed.length;
  const missing = Math.max(0, project.monthlyGoal - feed.length);
  const uncategorized = feed.filter((p) => !p.pillar).length;

  return (
    <aside className="paper stitched relative self-start rounded-[32px] px-6 pt-9 pb-7 text-sm">
      <Bow color={project.bg} className="absolute -top-4 left-1/2 h-9 w-14 -translate-x-1/2" />
      <p className="text-center text-[10px] tracking-[0.3em] text-mauve uppercase">
        análisis mensual
      </p>
      <p className="text-center font-script text-xl text-rose">non negociable</p>

      <p className="mt-4 text-center font-display leading-none" style={{ color: project.accent }}>
        <span className="text-6xl font-medium italic">{feed.length}</span>
        <span className="text-2xl text-mauve italic"> / {project.monthlyGoal}</span>
      </p>
      <p className="mt-1 text-center text-xs text-mauve">
        {missing ? `faltan ${missing} posts` : "¡meta cumplida! ♡"}
        {stories > 0 && ` · ${stories} ${stories === 1 ? "story" : "stories"}`}
      </p>

      {project.pillars.length > 0 && (
        <ul className="mt-6 space-y-3 border-t border-dashed border-petal pt-5">
          {project.pillars.map((pillar) => {
            const count = posts.filter((p) => p.pillar === pillar.name).length;
            const done = count >= pillar.target;
            return (
              <li key={pillar.name}>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-lg leading-none italic">
                    <span style={{ color: project.accent }}>{pillar.target}</span>{" "}
                    {pillar.name.toLowerCase()}
                  </span>
                  <span className="text-xs" style={{ color: done ? DONE : "var(--color-mauve)" }}>
                    {count}/{pillar.target} {done ? "♥" : "♡"}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-blush">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(1, pillar.target ? count / pillar.target : 1) * 100}%`,
                      background: done ? DONE : project.accent,
                    }}
                  />
                </div>
              </li>
            );
          })}
          {uncategorized > 0 && (
            <li className="pt-1 text-center font-display text-sm text-mauve italic">
              {uncategorized} sin categoría
            </li>
          )}
        </ul>
      )}
    </aside>
  );
}
