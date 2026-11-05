import type { Post } from "./types";

/** Por encima de cualquier fecha: los borradores sin fecha van arriba del feed. */
const TOP = 9e15;
/** Por debajo de cualquier fecha: lo publicado sin fecha (traído de Instagram) va al final. */
const BOTTOM = -9e15;
const DAY = 86_400_000;

/** Posición en el feed (más alto = más arriba), igual que Instagram: lo más nuevo arriba. */
export function feedRank(p: Post) {
  if (p.order !== undefined) return p.order;
  if (p.date) return Date.parse(`${p.date}T12:00:00Z`);
  return (p.status === "publicado" ? BOTTOM : TOP) + p.createdAt;
}

/**
 * Pone `moved` (en ese orden) en la posición `at` de `list` (orden visual, arriba → abajo).
 * Solo cambia el lugar de los que se mueven, sin tocar fechas ni el resto del feed.
 */
export function placeAt(list: Post[], moved: Post[], at: number): Post[] {
  const ids = new Set(moved.map((p) => p.id));
  const rest = list.filter((p) => !ids.has(p.id));
  const above = at > 0 ? feedRank(rest[at - 1]) : undefined;
  const below = at < rest.length ? feedRank(rest[at]) : undefined;
  const n = moved.length;
  const hi = above ?? (below === undefined ? TOP + n + 1 : below + DAY * (n + 1));
  const lo = below ?? hi - DAY * (n + 1);
  return moved.map((p, k) => ({ ...p, order: hi - ((hi - lo) * (k + 1)) / (n + 1) }));
}

/**
 * Posts cuya fecha no calza con su lugar. Se marcan los menos posibles: los que quedan fuera
 * de la secuencia más larga que sí va de la fecha más nueva (arriba) a la más vieja.
 */
export function outOfOrder(list: Post[]) {
  const dated = list.filter((p) => p.date);
  const best = dated.map(() => 1);
  const prev = dated.map(() => -1);
  dated.forEach((p, i) => {
    for (let j = 0; j < i; j++)
      if (dated[j].date! >= p.date! && best[j] + 1 > best[i]) {
        best[i] = best[j] + 1;
        prev[i] = j;
      }
  });
  const keep = new Set<string>();
  for (let i = best.indexOf(Math.max(0, ...best)); i >= 0; i = prev[i]) keep.add(dated[i].id);
  return new Set(dated.filter((p) => !keep.has(p.id)).map((p) => p.id));
}

/** Reparte las mismas fechas según el orden del feed (la más nueva arriba). */
export function datesFollowOrder(list: Post[]): Post[] {
  const dates = list
    .map((p) => p.date)
    .filter((d): d is string => !!d)
    .sort()
    .reverse();
  let k = 0;
  return list.map((p) => (p.date ? { ...p, date: dates[k++] } : p));
}
