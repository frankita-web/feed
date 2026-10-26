import type { Post, Project } from "@/lib/types";

/** "Análisis mensual non negociable": meta del mes y cuántos posts lleva cada categoría. */
export function MonthAnalysis({ project, posts }: { project: Project; posts: Post[] }) {
  const feed = posts.filter((p) => p.format !== "Stories");
  const stories = posts.length - feed.length;
  const missing = Math.max(0, project.monthlyGoal - feed.length);
  const uncategorized = feed.filter((p) => !p.pillar).length;

  return (
    <aside className="rounded-3xl bg-white/80 p-5 text-sm">
      <p className="text-xs font-bold tracking-[0.2em] text-neutral-900 uppercase">
        Análisis mensual
      </p>
      <p className="mt-3 text-3xl font-black" style={{ color: project.accent }}>
        {feed.length}
        <span className="text-lg font-bold text-neutral-400"> / {project.monthlyGoal} posts</span>
      </p>
      <p className="mt-1 text-neutral-500">
        {missing ? `Faltan ${missing}` : "¡Meta cumplida!"}
        {stories > 0 && ` · ${stories} ${stories === 1 ? "story" : "stories"}`}
      </p>

      {project.pillars.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {project.pillars.map((pillar) => {
            const count = posts.filter((p) => p.pillar === pillar.name).length;
            const done = count >= pillar.target;
            return (
              <li key={pillar.name}>
                <div className="flex justify-between">
                  <span className="font-semibold" style={{ color: project.accent }}>
                    {pillar.target} {pillar.name}
                  </span>
                  <span className={done ? "font-semibold text-[#2fa84f]" : "text-neutral-500"}>
                    {done ? "✓ " : ""}
                    {count}/{pillar.target}
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(1, pillar.target ? count / pillar.target : 1) * 100}%`,
                      background: done ? "#2fa84f" : project.accent,
                    }}
                  />
                </div>
              </li>
            );
          })}
          {uncategorized > 0 && (
            <li className="pt-1 text-xs text-neutral-500">{uncategorized} sin categoría</li>
          )}
        </ul>
      )}
    </aside>
  );
}
