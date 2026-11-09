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

export type PhotoKind = "drink" | "plato" | "ambiente" | "personas" | "otro";
export type PhotoLight = "dia" | "noche";

/**
 * Reglas del feed: nunca dos drinks seguidos y, en lo posible, alternar foto de día y de noche.
 * Respeta el orden propuesto y solo cambia lo necesario. Devuelve los ids en orden de publicación.
 */
export function feedRhythm<T extends { id: string; kind: PhotoKind; light: PhotoLight }>(items: T[]) {
  const left = [...items];
  const order: T[] = [];
  const fits = (prev: T | undefined, next: T, strict: boolean) =>
    !prev ||
    (!(prev.kind === "drink" && next.kind === "drink") && (!strict || prev.light !== next.light));
  while (left.length) {
    const prev = order[order.length - 1];
    const pick =
      left.findIndex((x) => fits(prev, x, true)) >= 0
        ? left.findIndex((x) => fits(prev, x, true))
        : Math.max(0, left.findIndex((x) => fits(prev, x, false)));
    order.push(left.splice(pick, 1)[0]);
  }
  return order.map((x) => x.id);
}

// Días de la semana para cada ritmo (0 = lunes). Hasta 3 por semana, nunca dos días seguidos.
const WEEK_DAYS: Record<number, number[]> = {
  1: [3],
  2: [1, 4],
  3: [0, 2, 4],
  4: [0, 2, 4, 6],
  5: [0, 1, 3, 4, 6],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

const shift = (key: string, n: number) => {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const weekday = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
};

/**
 * Próximas `count` fechas desde `start` con el ritmo semanal del cliente, sin caer en días
 * ocupados ni pegadas a ellos (nunca dos posts en días seguidos).
 */
export function weeklySlots(start: string, perWeek: number, count: number, taken: string[] = []) {
  const days = WEEK_DAYS[Math.min(7, Math.max(1, Math.round(perWeek)))];
  const busy = new Set(taken);
  const slots: string[] = [];
  for (let day = start, guard = 0; slots.length < count && guard < 1000; day = shift(day, 1), guard++) {
    if (!days.includes(weekday(day))) continue;
    const near = [day, shift(day, -1), shift(day, 1)];
    if (near.some((d) => busy.has(d))) continue;
    if (perWeek <= 3 && slots.length && slots[slots.length - 1] === shift(day, -1)) continue;
    slots.push(day);
  }
  return slots;
}
