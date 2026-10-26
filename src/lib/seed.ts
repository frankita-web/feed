import type { Format, Pillar, Post, State, Status } from "./types";

const CANCINO_PILLARS: Pillar[] = [
  { name: "PDM", target: 3 },
  { name: "Pizza", target: 2 },
  { name: "Entrada", target: 1 },
  { name: "Drink", target: 1 },
  { name: "Vegano", target: 1 },
  { name: "Barrio", target: 1 },
  { name: "Plato fuerte", target: 1 },
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
  ["2026-10-04", "Crumble", "Foto", "pendiente", null],
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

const CANCINO_NOTES: Record<string, string> = {
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
    }),
  );

  const notes = Object.fromEntries(
    Object.entries(CANCINO_NOTES).map(([date, text]) => [`cancino:${date}`, text]),
  );

  return {
    projects: [
      {
        slug: "cancino",
        name: "Cancino",
        instagram: "loscancinos",
        bg: "#f0bad8",
        accent: "#e8333f",
        monthlyGoal: 15,
        pillars: CANCINO_PILLARS,
      },
      {
        slug: "crissis",
        name: "Crissis",
        instagram: "",
        bg: "#f4e4c4",
        accent: "#b4532a",
        monthlyGoal: 12,
        pillars: [],
      },
      {
        slug: "issi",
        name: "Issi",
        instagram: "",
        bg: "#cfe1f4",
        accent: "#2f5bd3",
        monthlyGoal: 12,
        pillars: [],
      },
    ],
    posts,
    notes,
  };
}
