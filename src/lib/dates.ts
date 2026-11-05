export const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const WEEKDAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

const pad = (n: number) => String(n).padStart(2, "0");

/** month is 0-based, like Date. */
export function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function monthKey(year: number, month: number) {
  return `${year}-${pad(month + 1)}`;
}

export function todayKey() {
  const d = new Date();
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Blank cells before day 1 in a Monday-first week. */
export function leadingBlanks(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function weekdayOf(key: string) {
  const { year, month, day } = parseKey(key);
  return WEEKDAYS[(new Date(year, month, day).getDay() + 6) % 7];
}

export function shortDate(key: string) {
  const { month, day } = parseKey(key);
  return `${day} ${MONTHS[month].slice(0, 3)}`;
}

/** Lunes y domingo (YYYY-MM-DD) de la semana actual. */
export function weekRange() {
  const monday = mondayOf(todayKey());
  return [monday, addDays(monday, 6)] as const;
}

export function addDays(key: string, n: number) {
  const { year, month, day } = parseKey(key);
  const d = new Date(year, month, day + n);
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Lunes de la semana de `key`. */
export function mondayOf(key: string) {
  const { year, month, day } = parseKey(key);
  return addDays(key, -((new Date(year, month, day).getDay() + 6) % 7));
}
