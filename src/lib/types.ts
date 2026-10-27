export const FORMATS = [
  "Reel vertical",
  "Reel horizontal",
  "Post carrusel",
  "Foto",
  "Stories",
  "Tbc",
] as const;

export type Format = (typeof FORMATS)[number];

export const STATUSES = ["pendiente", "listo", "publicado"] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  pendiente: "Pendiente",
  listo: "Listo",
  publicado: "Publicado",
};

export type Pillar = {
  name: string;
  target: number;
};

export type Project = {
  slug: string;
  name: string;
  instagram: string;
  bg: string;
  accent: string;
  monthlyGoal: number;
  pillars: Pillar[];
  /** Paleta de la marca, para los detalles (esfera, puntitos, manijas). La base sigue gris. */
  palette?: string[];
  /** Color de pendiente / listo / publicado, elegido de la paleta. */
  statusColors?: Partial<Record<Status, string>>;
};

/** Colores de la marca; si no hay paleta, usa los dos colores de antes. */
export function paletteOf(project: Project) {
  return project.palette?.length ? project.palette : [project.accent, project.bg];
}

/** Archivo adjunto (video, PDF, diseño…) guardado en IndexedDB. */
export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
};

export type Post = {
  id: string;
  project: string;
  /** YYYY-MM-DD. `null` = publicado antes de usar el planner (solo aparece en el feed). */
  date: string | null;
  title: string;
  format: Format;
  status: Status;
  pillar: string | null;
  caption: string;
  /** Id de la imagen en IndexedDB, o ruta de /public (empieza con "/"). */
  image: string | null;
  createdAt: number;
  /** Fijado arriba en el perfil de Instagram. */
  pinned?: boolean;
  /** Hora de publicación, HH:MM. */
  time?: string;
  /** Resto de las imágenes del carrusel (la portada es `image`). */
  slides?: string[];
  files?: Attachment[];
};

export type State = {
  version?: number;
  projects: Project[];
  posts: Post[];
  /** Notas por día (efemérides, recordatorios). Llave: `${slug}:${YYYY-MM-DD}`. */
  notes: Record<string, string>;
};
