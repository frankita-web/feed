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
  /** Logo: ruta en /public o id de imagen subida. */
  logo?: string;
  /** Menú impreso del restaurante (sección Menú). */
  menu?: Menu;
  /** Carta de drinks (sección Drinks). */
  drinks?: Drink[];
  /** Drink planeado para cada mes. Llave: YYYY-MM. */
  drinkPlan?: Record<string, DrinkPlan>;
};

export type Drink = {
  name: string;
  section: string;
  description: string;
  /** Lleva alcohol de Diageo: cuenta para el post mensual obligatorio. */
  diageo: boolean;
  /** Otras formas de escribirlo en los títulos ("tommy", "enzoni"…). */
  aliases?: string[];
};

export type DrinkPlan = { drink: string; note?: string };

/** Un menú impreso: cada librito con sus páginas en orden (portada, adentro, contraportada). */
export type Menu = {
  title: string;
  pdf?: string;
  booklets: { name: string; pages: string[] }[];
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

/** Una toma del guion. */
export type Scene = {
  id: string;
  /** Plano: "detalle de la pizza", "plano medio"… */
  shot: string;
  action: string;
  /** Texto en pantalla. */
  onScreen: string;
  /** Voz en off, diálogo o música. */
  audio: string;
  seconds: string;
};

export const SCRIPT_STATUSES = ["idea", "borrador", "listo"] as const;

export type Script = {
  id: string;
  project: string;
  /** Publicación del calendario a la que pertenece el video. */
  postId: string | null;
  title: string;
  status: (typeof SCRIPT_STATUSES)[number];
  duration: string;
  /** Primeros 3 segundos. */
  hook: string;
  scenes: Scene[];
  /** Cierre / llamado a la acción. */
  closing: string;
  notes: string;
  /** Conversación con la IA (mensajes del chat). */
  chat?: unknown[];
  createdAt: number;
  updatedAt: number;
};

export const DELIVERABLE_KINDS = ["Video", "Fotos", "Carrusel", "Otro"] as const;

/** Algo que el fotógrafo / videógrafo tiene que entregar de un shoot. */
export type Deliverable = {
  id: string;
  title: string;
  kind: (typeof DELIVERABLE_KINDS)[number];
  status: "pendiente" | "entregado";
  /** Portada (imagen guardada). */
  cover: string | null;
  /** Fotos extra (carrusel). */
  slides: string[];
  /** Videos y otros archivos entregados. */
  files: Attachment[];
  /** Publicación del feed donde se usó. */
  postId: string | null;
};

export type Shoot = {
  id: string;
  project: string;
  title: string;
  /** Día del shoot. */
  date: string | null;
  /** Quién fotografió / grabó. */
  crew: string;
  /** Fecha en que prometieron entregar. */
  due: string | null;
  notes: string;
  items: Deliverable[];
  createdAt: number;
};

export type State = {
  version?: number;
  shoots?: Shoot[];
  projects: Project[];
  posts: Post[];
  scripts?: Script[];
  /** Notas por día (efemérides, recordatorios). Llave: `${slug}:${YYYY-MM-DD}`. */
  notes: Record<string, string>;
};
