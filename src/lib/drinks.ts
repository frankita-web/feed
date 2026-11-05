import type { Drink, DrinkPlan, Post, Project } from "./types";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[´'’`]/g, "");

/** Drinks de la carta que aparecen en el título del post. */
export function drinksIn(post: Post, drinks: Drink[]) {
  const title = norm(post.title);
  return drinks.filter((d) => [d.name, ...(d.aliases ?? [])].some((n) => title.includes(norm(n))));
}

/** Post de drink: categoría Drink, o nombra un drink de la carta. */
export function isDrinkPost(post: Post, project: Project) {
  return (
    post.format !== "Stories" &&
    (post.pillar === "Drink" || drinksIn(post, project.drinks ?? []).length > 0)
  );
}

/** Cuenta para Diageo: nombra un drink Diageo o dice "Diageo" en el título. */
export function isDiageoPost(post: Post, project: Project) {
  return (
    norm(post.title).includes("diageo") ||
    drinksIn(post, project.drinks ?? []).some((d) => d.diageo)
  );
}

const d = (
  section: string,
  name: string,
  description: string,
  diageo = false,
  aliases?: string[],
): Drink => ({ section, name, description, diageo, ...(aliases && { aliases }) });

/** Carta de Cancino. Los subrayados en la carta = Diageo. */
export const CANCINO_DRINKS: Drink[] = [
  d("Los spritz", "Primo Spritz", "Primo, vino espumoso, toronja y agua mineral. 180 ml"),
  d("Los spritz", "Súper Primo Spritz RTD", "La versión en lata del Primo Spritz. 240 ml"),
  d("Los spritz", "Primoncello Spritz", "Primo, limoncello y vino espumoso. 160 ml"),
  d(
    "Los spritz",
    "Paloma Spritz",
    "Mezcal Unión Uno, Primo, toronja y vino espumoso. 195 ml",
    true,
  ),
  d(
    "Los spritz",
    "St-Germain Spritz",
    "St-Germain, vino espumoso, albahaca y agua mineral. 180 ml",
  ),
  d(
    "Los spritz",
    "Dirty Spritz",
    "Vodka Ketel One, Carpano Bianco, Carpano Dry, salmuera de aceituna y agua mineral. 200 ml",
    true,
  ),
  d(
    "De la casa",
    "Flotador",
    "Mezcal Unión Uno, jamaica con romero, limón y nieve de limón. 155 ml",
    true,
  ),
  d("De la casa", "Irish Clover", "Whiskey Jameson, frutos rojos, limón y ginger ale. 200 ml"),
  d("De la casa", "Bloody Tabasco", "Vodka Absolut Tabasco, clamato, limón y encurtidos. 165 ml"),
  d(
    "De la casa",
    "Tall Martini",
    "Gin Roku, Carpano Dry, Carpano Bianco, bitter de naranja y tónica. 180 ml",
  ),
  d("Los clásicos", "Negroni", "Tanqueray London, Carpano Rosso y Campari. 95 ml", true),
  d("Los clásicos", "Espresso Martini", "Vodka Grey Goose, licor de café y espresso. 105 ml"),
  d(
    "Los clásicos",
    "Bull",
    "Ron Zacapa Ámbar, limón, jarabe natural, agua mineral y cerveza clara. 225 ml",
    true,
  ),
  d("Los clásicos", "Mojito", "Ron Havana 3, hierbabuena, limón y agua mineral. 180 ml"),
  d("Los clásicos", "G&T", "Ginebra Armónico Mango y agua tónica. 225 ml"),
  d("Los clásicos", "Whisky Highball", "Whisky Suntory Toki y agua mineral. 225 ml"),
  d(
    "De agave",
    "Tommy's Margarita",
    "Tequila Don Julio Reposado, limón y miel de agave. 115 ml",
    true,
    ["tommy"],
  ),
  d(
    "De agave",
    "Margarita Margherita",
    "Tequila Patrón Silver, licor de pimiento, albahaca, cherry, limón y agave. 105 ml",
  ),
  d(
    "De agave",
    "Paloma Crafted",
    "Tequila 1800 blanco, toronja, limón, agave y soda de guayaba. 225 ml",
  ),
  d("Fuera de carta", "Pepe Enzoni", "Drink Diageo del plan anual (mayo y julio).", true, [
    "enzoni",
  ]),
  d(
    "Non alc",
    "Vermút Spritz Cero",
    "Vermút 0.0%, salmuera, vino espumoso sin alcohol y aceituna. 180 ml",
  ),
  d("Non alc", "El Suegro", "Agua mineral, limón, salmuera y aceituna gordal. 200 ml"),
  d("Non alc", "Gin Tonic 0,0%", "Ginebra Beefeater 0.0% y agua tónica. 225 ml"),
  d("Non alc", "(Re) Fresco", "Pepino, hierbabuena, limón y agua mineral. 165 ml"),
  d("Non alc", "Limonada Bola", "Limonada mineral con nieve de limón amarillo. 180 ml"),
  d("Non alc", "Orangette", "Naranja, limón, sal y agua mineral. 180 ml"),
  d("Non alc", "Corona Cero", "Cerveza sin alcohol. 355 ml"),
  d("Non alc", "Colimita IPA 0.0%", "IPA sin alcohol. 355 ml"),
];

/** "Drinks anuales" del PDF de Cancino. */
export const CANCINO_DRINK_PLAN: Record<string, DrinkPlan> = {
  "2026-03": { drink: "Flotador" },
  "2026-04": { drink: "Paloma Spritz" },
  "2026-05": { drink: "Pepe Enzoni" },
  "2026-06": { drink: "Flotador", note: "Mix camisetas mundial" },
  "2026-07": { drink: "Pepe Enzoni" },
  "2026-08": { drink: "Flotador" },
  "2026-09": { drink: "Primo Spritz", note: "Grabado" },
  "2026-10": { drink: "Tommy's Margarita", note: "Grabado" },
  "2026-11": { drink: "Dirty Spritz", note: "Grabado" },
  "2026-12": { drink: "Negroni", note: "o Bull" },
};
