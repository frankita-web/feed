import { MONTHS, monthKey, todayKey } from "./dates";
import { FORMATS, type Post, type Project } from "./types";

export type Report = ReturnType<typeof monthReport>;

const monthPosts = (posts: Post[], year: number, month: number) =>
  posts.filter((p) => p.date?.startsWith(monthKey(year, month)));

/** Lo que se planificó y publicó en un mes, comparado con las metas del proyecto. */
export function monthReport(project: Project, posts: Post[], year: number, month: number) {
  const today = todayKey();
  const all = monthPosts(posts, year, month);
  const feed = all.filter((p) => p.format !== "Stories");
  const published = all.filter((p) => p.status === "publicado").length;
  const late = all.filter((p) => p.status !== "publicado" && p.date! < today);
  const uncategorized = feed.filter((p) => !p.pillar).length;
  const pillars = project.pillars.map((pillar) => ({
    ...pillar,
    count: feed.filter((p) => p.pillar === pillar.name).length,
  }));
  const formats = FORMATS.map((name) => ({
    name,
    count: all.filter((p) => p.format === name).length,
  })).filter((f) => f.count > 0);

  // Este mes y los cinco anteriores.
  const history = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(year, month - 5 + i, 1);
    const list = monthPosts(posts, date.getFullYear(), date.getMonth());
    return {
      label: MONTHS[date.getMonth()].slice(0, 3),
      count: list.filter((p) => p.format !== "Stories").length,
    };
  });

  const missing = Math.max(0, project.monthlyGoal - feed.length);
  const advice = [
    missing > 0 && `Faltan ${missing} ${missing === 1 ? "post" : "posts"} para la meta del mes.`,
    ...pillars
      .filter((p) => p.count < p.target)
      .map((p) => `Faltan ${p.target - p.count} de ${p.name}.`),
    late.length > 0 &&
      `${late.length} ${late.length === 1 ? "publicación quedó atrasada" : "publicaciones quedaron atrasadas"}.`,
    uncategorized > 0 &&
      `${uncategorized} ${uncategorized === 1 ? "post" : "posts"} sin categoría.`,
  ].filter((text): text is string => !!text);

  return {
    total: all.length,
    feed: feed.length,
    stories: all.length - feed.length,
    goal: project.monthlyGoal,
    published,
    late: late.length,
    pillars,
    formats,
    history,
    advice,
  };
}
