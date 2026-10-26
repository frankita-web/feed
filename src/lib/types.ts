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
  /** Id de la imagen guardada en IndexedDB. */
  image: string | null;
  createdAt: number;
};

export type State = {
  projects: Project[];
  posts: Post[];
  /** Notas por día (efemérides, recordatorios). Llave: `${slug}:${YYYY-MM-DD}`. */
  notes: Record<string, string>;
};
