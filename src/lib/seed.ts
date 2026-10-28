import { CANCINO_DRINKS, CANCINO_DRINK_PLAN } from "./drinks";
import type { Format, Pillar, Post, Project, State, Status } from "./types";

const CANCINO_PILLARS: Pillar[] = [
  { name: "PDM", target: 3 },
  { name: "Pizza", target: 2 },
  { name: "Entrada", target: 1 },
  { name: "Drink", target: 1 },
  { name: "Vegano", target: 1 },
  { name: "Barrio", target: 1 },
  { name: "Plato fuerte", target: 1 },
  { name: "Postre", target: 1 },
];

type SeedPost = [
  date: string,
  title: string,
  format: Format,
  status: Status,
  pillar: string | null,
];

// Calendario de Cancino tal como estaba en Canva (oct–dic 2026).
const CANCINO_POSTS: SeedPost[] = [
  ["2026-10-01", "PDM Ximena", "Reel vertical", "pendiente", "PDM"],
  ["2026-10-04", "Crumble", "Foto", "pendiente", "Postre"],
  ["2026-10-08", "Fotos PDM", "Post carrusel", "pendiente", "PDM"],
  ["2026-10-10", "Un día en Cancino Cabrera", "Post carrusel", "pendiente", "Barrio"],
  ["2026-10-15", "Vídeo PDM", "Reel horizontal", "pendiente", "PDM"],
  ["2026-10-21", "Vídeo PDM", "Reel vertical", "listo", "PDM"],
  ["2026-10-23", "Drink Tommy Marg · A esto sabe el viernes", "Reel vertical", "pendiente", "Drink"],
  ["2026-10-26", "Pasta Salmon", "Post carrusel", "pendiente", "Plato fuerte"],
  ["2026-10-28", "Reto pepsi Vegano", "Tbc", "listo", "Vegano"],
  ["2026-10-29", "Los bordes 🍕", "Reel horizontal", "pendiente", "Pizza"],
  ["2026-10-30", "Teaser", "Stories", "pendiente", null],
  ["2026-10-31", "Despedida", "Reel vertical", "pendiente", null],
  ["2026-11-01", "PDM", "Reel vertical", "listo", "PDM"],
  ["2026-11-06", "PDM", "Reel vertical", "listo", "PDM"],
  ["2026-11-08", "Drink Diageo", "Reel vertical", "pendiente", "Drink"],
  ["2026-11-10", "Comentarios Vegan", "Tbc", "listo", "Vegano"],
  ["2026-11-13", "Papas Gajo", "Foto", "pendiente", "Entrada"],
  ["2026-11-19", "PDM", "Reel vertical", "listo", "PDM"],
  ["2026-11-29", "Teaser", "Stories", "listo", null],
  ["2026-11-30", "Despedida", "Tbc", "listo", null],
  ["2026-12-05", "Aniversario 15 años", "Tbc", "pendiente", null],
];

/** Lo que ya está en el Instagram de Cancino (captura del 26 oct), por índice de CANCINO_POSTS. */
export const CANCINO_PUBLISHED: Record<number, Partial<Post>> = {
  0: { status: "publicado" },
  1: { status: "publicado", format: "Post carrusel", image: "/feed/cancino-6.jpg" },
  2: { status: "publicado", image: "/feed/cancino-5.jpg" },
  3: { status: "publicado", image: "/feed/cancino-4.jpg" },
  4: { status: "publicado", image: "/feed/cancino-3.jpg" },
  5: { status: "publicado", image: "/feed/cancino-2.jpg" },
};

export const CANCINO_PINNED: Post = {
  id: "seed-cancino-fijado",
  project: "cancino",
  date: null,
  title: "A base de plantas",
  format: "Foto",
  status: "publicado",
  pillar: "Vegano",
  caption: "",
  image: "/feed/cancino-1.jpg",
  createdAt: 0,
  pinned: true,
};

export const SEED_VERSION = 14;

/** Menú Cancino Cibeles 2026 (v13). */
export const CANCINO_MENU: Project["menu"] = {
  title: "Cancino Cibeles · 2026",
  pdf: "/menus/cancino-cibeles-2026.pdf",
  booklets: [
    { name: "Comida", pages: [1, 2, 3, 4].map((n) => `/menus/cancino/p${n}.jpg`) },
    { name: "Bebidas", pages: [5, 6, 7, 8].map((n) => `/menus/cancino/p${n}.jpg`) },
  ],
};

/** Videos de reels de Cancino (v9), por índice de CANCINO_POSTS. */
export const CANCINO_VIDEOS: Record<number, Partial<Post>> = {
  6: {
    image: "/feed/cancino-margarita.jpg",
    files: [
      {
        id: "/feed/cancino-margarita.mov",
        name: "MARGARITA.mov",
        type: "video/quicktime",
        size: 25702589,
      },
    ],
  },
  7: {
    image: "/feed/cancino-rigatoni.jpg",
    files: [
      {
        id: "/feed/cancino-rigatoni.mov",
        name: "RIGATONI_001.mov",
        type: "video/quicktime",
        size: 11887324,
      },
    ],
  },
  8: {
    files: [
      { id: "/feed/cancino-reto-vegano.mp4", name: "veg.mp4", type: "video/mp4", size: 36559014 },
    ],
  },
};

/** Versión en que se agregó cada video (para no volver a ponerlos si se quitaron). */
export const CANCINO_VIDEOS_SINCE: Record<number, number> = { 6: 9, 7: 11, 8: 9 };

/** Paletas de marca (v6). `accent` es el color principal de cada una. */
export const BRAND_COLORS: Record<
  string,
  Pick<Project, "palette" | "accent" | "statusColors">
> = {
  cancino: {
    palette: ["#e5003e", "#f7c2c4", "#aa1831"],
    accent: "#e5003e",
    statusColors: { pendiente: "#e5003e", listo: "#f7c2c4", publicado: "#aa1831" },
  },
  crissis: {
    palette: ["#ffff95", "#b4ffd7", "#ec0000", "#f9ceff", "#ffffff"],
    accent: "#ec0000",
    statusColors: { pendiente: "#ec0000", listo: "#b4ffd7", publicado: "#f9ceff" },
  },
  issi: {
    palette: ["#f8f6e6", "#241e1f"],
    accent: "#241e1f",
    statusColors: { pendiente: "#241e1f", listo: "#f8f6e6", publicado: "#8a8378" },
  },
};

// Feed actual de Crissis (captura del grid, 26 oct). Lo más nuevo primero.
const CRISSIS_FEED: [date: string | null, title: string, format: Format, caption: string][] = [
  [
    null,
    "Crissis es un bar",
    "Foto",
    "crissis es un bar. volvemos a lo que siempre quisimos ser: un lugar de tragos, de encuentros, de despedidas que se vuelven una última.",
  ],
  [
    "2026-10-14",
    "Hugo the wine bar",
    "Reel vertical",
    "hugo the wine bar en crissis bistró.\n\n< la noche se cuenta sola >\n\nfotos @carlocanun",
  ],
  ["2026-10-05", "Rico, rico, rico", "Post carrusel", "< rico, rico, rico >\nahora ya en comida y en cena. 🥪🧀"],
  ["2026-09-30", "Postre de coco", "Foto", "3 🥛🥥"],
  [null, "Coctel con cereza", "Foto", ""],
  [null, "Ensalada con higos", "Foto", ""],
  [null, "Equipo y botellas", "Foto", ""],
  [null, "Camarones", "Post carrusel", ""],
  [null, "Alitas", "Post carrusel", ""],
];

export const CRISSIS_POSTS: Post[] = CRISSIS_FEED.map(([date, title, format, caption], i) => ({
  id: `seed-crissis-${i}`,
  project: "crissis",
  date,
  title,
  format,
  status: "publicado",
  pillar: null,
  caption,
  image: `/feed/crissis-${i + 1}.jpg`,
  createdAt: 100 - i,
  pinned: i === 0,
}));


// Julio–septiembre 2026, del PDF "Feed Parrilla Grilla Instagram Cancino". Ya publicado.
const CANCINO_HISTORY: [date: string, title: string, format: Format, pillar: string | null][] = [
  ["2026-07-02", "Memo", "Foto", null],
  ["2026-07-03", "Memos", "Reel vertical", null],
  ["2026-07-04", "Pásele Mixcoac Caja", "Reel vertical", "Barrio"],
  ["2026-07-06", "Pizza", "Foto", "Pizza"],
  ["2026-07-07", "PDM Scuby PM", "Reel vertical", "PDM"],
  ["2026-07-09", "PDM fotos selección 1", "Post carrusel", "PDM"],
  ["2026-07-15", "Caja caminando", "Reel vertical", "Barrio"],
  ["2026-07-20", "Despedida Ricardo", "Stories", null],
  ["2026-07-21", "Fotos entradas", "Post carrusel", "Entrada"],
  ["2026-07-23", "Scuby vídeo Cabrera", "Reel vertical", "Barrio"],
  ["2026-07-25", "PDM fotos selección 2", "Reel vertical", "PDM"],
  ["2026-07-27", "Drink Diageo mensual · Pepe Enzoni", "Reel vertical", "Drink"],
  ["2026-07-29", "WTF es", "Post carrusel", null],
  ["2026-07-29", "Anunciar Hotbook", "Stories", null],
  ["2026-07-30", "Teaser Ricardo Verdejo", "Stories", null],
  ["2026-07-31", "Despedida Scuby", "Reel vertical", null],
  ["2026-08-01", "PDM Ricardo Verdejo", "Reel vertical", "PDM"],
  ["2026-08-02", "Teaser Plantas", "Stories", null],
  ["2026-08-03", "Hero planta 🌱", "Reel vertical", "Vegano"],
  ["2026-08-04", "Foto menú 🌱", "Foto", "Vegano"],
  ["2026-08-05", "Emojis trend 👑", "Foto", null],
  ["2026-08-06", "Platillos 🌱", "Foto", "Vegano"],
  ["2026-08-09", "Diccionario hongos PDM", "Post carrusel", "PDM"],
  ["2026-08-11", "Video hongos Ricardo", "Reel horizontal", "PDM"],
  ["2026-08-14", "Flotador Diageo", "Reel vertical", "Drink"],
  ["2026-08-16", "PDM fotos selección 1", "Post carrusel", "PDM"],
  ["2026-08-17", "Stopmotion pescaditos", "Post carrusel", null],
  ["2026-08-19", "Fotos caminando Ricardo al centro", "Post carrusel", "Barrio"],
  ["2026-08-21", "Entradas, DIPPPPP", "Reel vertical", "Entrada"],
  ["2026-08-25", "Pizzas", "Foto", "Pizza"],
  ["2026-08-27", "PDM fotos selección 2", "Reel vertical", "PDM"],
  ["2026-08-30", "Teaser", "Stories", null],
  ["2026-08-31", "Despedida", "Reel vertical", null],
  ["2026-09-01", "PDM Santiago", "Reel vertical", "PDM"],
  ["2026-09-03", "Elle", "Foto", null],
  ["2026-09-08", "Qué prefieres, Vegan 🌱", "Reel vertical", "Vegano"],
  ["2026-09-10", "Entrevista Stgo PDM", "Reel horizontal", "PDM"],
  ["2026-09-13", "Anatomía Pepperita 🍕", "Reel horizontal", "Pizza"],
  ["2026-09-16", "Fotos PDM · Dump", "Post carrusel", "PDM"],
  ["2026-09-18", "Carpaccio atún 📸", "Post carrusel", "Entrada"],
  ["2026-09-22", "Pizza Huitlacoche", "Post carrusel", "Pizza"],
  ["2026-09-24", "Pollo a la cazadora 📸", "Post carrusel", "Plato fuerte"],
  ["2026-09-26", "Drink Diageo · Primo Spritz 🍹", "Reel vertical", "Drink"],
  ["2026-09-29", "Teaser", "Stories", null],
  ["2026-09-30", "Despedida", "Reel vertical", null],
];

export const CANCINO_HISTORY_POSTS: Post[] = CANCINO_HISTORY.map(
  ([date, title, format, pillar], i) => ({
    id: `seed-cancino-h${i}`,
    project: "cancino",
    date,
    title,
    format,
    status: "publicado",
    pillar,
    caption: "",
    image: null,
    createdAt: i,
  }),
);

/** Fotos del feed armado en Canva para posts que vienen (v3), por índice de CANCINO_POSTS. */
export const CANCINO_PLANNED_IMAGES: Record<number, string> = {
  0: "/feed/cancino-anchoas.jpg",
  6: "/feed/cancino-drink-tommy.jpg",
  8: "/feed/cancino-menu-plantas.jpg",
  9: "/feed/cancino-los-bordes.jpg",
};


export const CANCINO_NOTES: Record<string, string> = {
  "2026-06-29": "Shoot San Miguel",
  "2026-06-30": "Shoot Mixcoac · juega México",
  "2026-07-05": "Juega México",
  "2026-07-06": "Shoot Pam",
  "2026-07-19": "Final mundial ⚽",
  "2026-07-30": "Hotbook fair (30 jul – 2 ago)",
  "2026-08-01": "Rebranding: menú a base de plantas",
  "2026-08-03": "Activación menú vegano (3 – 9 ago)",
  "2026-09-05": "Fiesta galería Stgo",
  "2026-09-16": "Independencia de México",
  "2026-09-22": "Empieza el otoño",
  "2026-09-28": "Vuelve Franca",
  "2026-10-25": "Día internacional de la pasta",
  "2026-11-01": "Día de muertos",
  "2026-11-16": "Revolución Mexicana",
  "2026-12-01": "Concurso",
  "2026-12-21": "Empieza el invierno",
};

export function seedState(): State {
  const posts: Post[] = CANCINO_POSTS.map(
    ([date, title, format, status, pillar], i) => ({
      id: `seed-cancino-${i}`,
      project: "cancino",
      date,
      title,
      format,
      status,
      pillar,
      caption: "",
      image: null,
      createdAt: i,
      ...CANCINO_PUBLISHED[i],
      ...(CANCINO_PLANNED_IMAGES[i] && { image: CANCINO_PLANNED_IMAGES[i] }),
      ...CANCINO_VIDEOS[i],
    }),
  );
  posts.push(CANCINO_PINNED, ...CANCINO_HISTORY_POSTS, ...CRISSIS_POSTS);

  const notes = Object.fromEntries(
    Object.entries(CANCINO_NOTES).map(([date, text]) => [`cancino:${date}`, text]),
  );

  return {
    version: SEED_VERSION,
    projects: [
      {
        slug: "cancino",
        name: "Cancino",
        instagram: "loscancinos",
        bg: "#f7c2c4",
        monthlyGoal: 15,
        pillars: CANCINO_PILLARS,
        ...BRAND_COLORS.cancino,
        logo: "/logos/cancino.svg",
        menu: CANCINO_MENU,
        drinks: CANCINO_DRINKS,
        drinkPlan: CANCINO_DRINK_PLAN,
      },
      {
        slug: "crissis",
        name: "Crissis",
        instagram: "crissis.crissisbistro",
        bg: "#ffff95",
        monthlyGoal: 12,
        pillars: [],
        ...BRAND_COLORS.crissis,
      },
      {
        slug: "issi",
        name: "Issi",
        instagram: "issi_rest",
        bg: "#f8f6e6",
        ...BRAND_COLORS.issi,
        monthlyGoal: 12,
        pillars: [],
      },
    ],
    posts,
    notes,
  };
}
