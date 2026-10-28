import type { Post } from "./types";

/** Por encima de cualquier fecha: lo que se acomoda a mano va arriba de lo publicado. */
const TOP = 9e15;

/** Posición en el feed (más alto = más arriba), igual que Instagram: lo más nuevo arriba. */
export function feedRank(p: Post) {
  if (p.order !== undefined) return p.order;
  if (p.date) return Date.parse(`${p.date}T12:00:00Z`);
  return p.status === "publicado" ? -Infinity : TOP + p.createdAt;
}

/** Guarda el orden visual elegido (arriba → abajo) sin tocar las fechas. */
export function arrange(list: Post[]): Post[] {
  return list.map((p, i) => ({ ...p, order: TOP + (list.length - i) }));
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
