/** Los números que se muestran, en este orden. */
export const INSIGHT_FIELDS = [
  ["followers", "Seguidores"],
  ["followersGained", "Seguidores nuevos"],
  ["reach", "Cuentas alcanzadas"],
  ["views", "Visualizaciones"],
  ["interactions", "Interacciones"],
  ["likes", "Me gusta"],
  ["comments", "Comentarios"],
  ["saves", "Guardados"],
  ["shares", "Compartidos"],
  ["profileVisits", "Visitas al perfil"],
  ["linkClicks", "Clics en enlaces"],
] as const;

export const formatNumber = (n: number) => n.toLocaleString("es-MX");

/** Cuánto cambió contra el mes anterior, como "+12%". */
export function change(now?: number | null, before?: number | null) {
  if (now == null || before == null || before === 0) return null;
  const pct = Math.round(((now - before) / Math.abs(before)) * 100);
  return pct === 0 ? "igual" : `${pct > 0 ? "+" : ""}${pct}%`;
}
