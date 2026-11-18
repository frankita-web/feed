import { CANCINO_DRINKS, CANCINO_DRINK_PLAN } from "./drinks";
import type { Format, Idea, Pillar, Post, Project, State, Status } from "./types";

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
};

export const SEED_VERSION = 29;

/** Tono de Cancino, como lo pidió Franca (9 nov 2026). */
export const CANCINO_VOICE = "pizzería grande y conocida: cada copy empuja a comprar.\nsiempre termina con un llamado a la acción claro: pide, ven, reserva, ordena por delivery, búscanos.\ndi qué es y por qué se antoja (la pizza, el plato o el drink de la foto), sin rodeos.\nque la gente sepa dónde encontrarnos: menciona la sucursal, la dirección o cómo pedir solo si aparecen aquí o en el copy actual; si no, invita a escribir por mensaje o a ver el link del perfil.\nsin hashtags.";

/** Tono de Issi, de la presentación de marca que mandó Franca (13 nov 2026). */
export const ISSI_VOICE = `elegante y más formal, con voz femenina: poemas cortos e historias, nunca venta directa.
frases calmadas, sin prisa, con pausas (puntos). mayúscula al inicio y puntuación cuidada.
sin emojis y sin hashtags.
si el post es de un platillo, puede cerrar con una línea aparte en minúscula con lo que lleva, separado por " · " (ej. crudo del día · yuzu · yuzukosho de habanero · manzana verde).
de vez en cuando, una frase corta que pueda volverse viral.
copys anteriores para inspirarse:
- Al chayote nadie lo venía venir.
- Pastel de frambuesas y merengue para cumplir fantasías.
- Una cuchara que levanta todo esto es, por un momento, el centro del mundo.
- Algunas cosas llegan mejor sin cocción. Sin prisa. Sin ruido.
- Algunos platos no cambian. Se transforman con lo que la tierra da.
- Lo que llega del mar no necesita más que honestidad.`;

/** Categorías de Issi: el restaurante al centro, con comida, espacio, arte y una frase de vez en cuando. */
export const ISSI_PILLARS = [
  { name: "Comida", target: 5 },
  { name: "Espacio", target: 3 },
  { name: "Arte", target: 3 },
  { name: "Frases", target: 1 },
];

/** Tono de Crissis, como lo pidió Franca (9 nov 2026). */
export const CRISSIS_VOICE = `sin hashtags, nunca.
todo en minúscula, también la primera letra y los nombres.
divertido y corto: una frase con giro, juego de palabras o complicidad. emojis casi nunca.
copys anteriores para inspirarse:
- ❗️nuestro vermouth casero ❗️
- la crisis acompañado, se vive distinto.
- dollar pancakes + sbagliato + charly garcía.
- crissis señala, el camarón con caviar responde.
- bienvenidos al bistró de barrio.
- alitas y cerveza. ninguna intención de irnos temprano.`;

/** Menú a base de plantas de Cancino, una sola hoja (v23, 18 nov 2026). */
export const CANCINO_PLANT_MENU = {
  name: "A base de plantas",
  pages: ["/menus/cancino/plantas.jpg"],
};

/** Menú Cancino Cibeles 2026 (v13). */
export const CANCINO_MENU: Project["menu"] = {
  title: "Cancino Cibeles · 2026",
  pdf: "/menus/cancino-cibeles-2026.pdf",
  booklets: [
    { name: "Comida", pages: [1, 2, 3, 4].map((n) => `/menus/cancino/p${n}.jpg`) },
    { name: "Bebidas", pages: [5, 6, 7, 8].map((n) => `/menus/cancino/p${n}.jpg`) },
    CANCINO_PLANT_MENU,
  ],
};

/** Ideas que pidió Franca (18 nov 2026): el «made of» del betabel y la funghi en un bosque. */
export const CANCINO_IDEAS_V23: Idea[] = [
  {
    id: "seed-idea-betabel-made-of",
    project: "cancino",
    title: "Made of: betabel horneado con jocoque de tofu",
    notes: `Reel vertical 9:16 · 15–20 s

HOOK (0–1 s): el betabel entero sale humeando del horno de leña.
Texto: «¿DE QUÉ ESTÁ HECHO?»

TOMAS
1. Betabel crudo, entero, solo sobre la mesa. Texto: «BETABEL»
2. Entra al horno de leña y sale asado. Texto: «ASADO A LA LEÑA»
3. La reducción de balsámico cae en un hilo. Texto: «BALSÁMICO AÑEJO»
4. La cuchara extiende el jocoque en el plato. Texto: «JOCOQUE DE TOFU»
5. Zaatar, aceite de oliva y ralladura de limón amarillo encima. Texto: «ZAATAR + LIMÓN»
6. El plato terminado, desde arriba. Texto: «100% A BASE DE PLANTAS»

ESTILO: cada ingrediente aparece solo sobre un fondo limpio y al final se arma el plato. Un corte por ingrediente, al ritmo de la música.

AUDIO: beat con un golpe en cada ingrediente y el sonido real del balsámico y la cuchara.

COPY: Betabel asado a la leña con reducción de balsámico añejo, sobre un jocoque hecho de tofu, con zaatar y limón amarillo. 🌱 100% a base de plantas y 100% antojo. Pídelo hoy en Cancino o por delivery.

NECESITAMOS: 2 o 3 betabeles enteros crudos, el plato armado, jocoque de tofu, balsámico, zaatar y limón amarillo; luz lateral suave y un fondo liso.

REFERENCIAS
Ingredientes uno por uno: https://www.pinterest.com/search/pins/?q=ingredients%20breakdown%20food%20video
Betabel asado con yogurt: https://www.pinterest.com/search/pins/?q=roasted%20beets%20labneh%20zaatar`,
    link: "",
    pillar: "Vegano",
    shootId: null,
    done: false,
    createdAt: Date.UTC(2026, 10, 18, 19, 30),
  },
  {
    id: "seed-idea-funghi-bosque",
    project: "cancino",
    title: "Así suena la pizza funghi: un bosque encantado",
    notes: `Post foto · 1 imagen

HOOK: la funghi en medio de un bosque de cuento: musgo, helechos y hongos chiquitos alrededor, con luz que entra entre las hojas.
Texto: «ASÍ SUENA LA FUNGHI»

LA FOTO
1. La pizza entera al centro, sobre un tronco o una tabla cubierta de musgo.
2. Alrededor, hongos de verdad (los de temporada que lleva la pizza), helechos y hojas secas.
3. Un poco de humo o neblina y lucecitas cálidas desenfocadas atrás, como un bosque de hadas.
4. Una rebanada apenas separada, con los hongos doraditos bien a la vista.

ESTILO: solo foto, sin video. Colores de bosque (verdes, cafés, dorados) y la pizza como lo más luminoso. El texto escrito a mano en una esquina, chiquito.

COPY: Así suena la Funghi: el crujido del borde y hongos de temporada bien doraditos, con flor de sal y perejil. 🍄 También a base de plantas. Pídela hoy en Cancino o por delivery.

NECESITAMOS: una funghi recién salida, musgo, helechos, hongos frescos, una tabla o tronco, humo o máquina de neblina y luces cálidas.

REFERENCIAS
Bosque de hadas con comida: https://www.pinterest.com/search/pins/?q=fairy%20forest%20food%20photography
Hongos y musgo en la mesa: https://www.pinterest.com/search/pins/?q=mushroom%20moss%20food%20styling`,
    link: "",
    pillar: "Pizza",
    shootId: null,
    done: false,
    createdAt: Date.UTC(2026, 10, 18, 19, 31),
  },
];

/** «Reglas de la casa», más amigable (Franca, 18 nov 2026): reglas inventadas para pasarlo bien. */
export const CANCINO_HOUSE_RULES = {
  title: "Reglas de la casa (inventadas por nosotros)",
  notes: `Reel vertical 9:16 · 15–20 s

HOOK (0–1 s): el pizzero mira a cámara, sonríe y levanta un papel escrito a mano.
Texto: «REGLAS DE LA CASA»

TOMAS
1. Gente entrando, saludando y riéndose. Texto: «REGLA 1: LLEGAR CON BUEN ÁNIMO»
2. Alguien recorre la carta con el dedo y pide de todo. Texto: «REGLA 2: PEDIR LO QUE SE TE ANTOJE»
3. Platos vacíos y alguien rescatando la última rebanada. Texto: «REGLA 3: NO DEJAR NADA»
4. Llega el crumble con helado a la mesa. Texto: «REGLA 4: SIEMPRE HAY ESPACIO PARA EL POSTRE»
5. Varias cucharas en el pastel de cacao. Texto: «REGLA 5: ALGO DULCE AL FINAL, SIEMPRE»
6. Cierre: el pizzero guiña el ojo. Texto: «(SÍ, LAS INVENTAMOS NOSOTROS)»

MÁS REGLAS INVENTADAS (para elegir o para otro video)
1. La última rebanada se comparte.
2. Se brinda aunque no haya nada que celebrar.
3. Si dudas entre dos pizzas, pide las dos.
4. Volver pronto.

ESTILO: cada regla escrita a mano encima del video, con una carita o un corazón dibujado; tono juguetón, nada de regaños. El pizzero en blanco y negro y la comida a color.

AUDIO: una canción alegre y la voz de alguien leyendo cada regla.

COPY: Reglas de la casa: llegar con buen ánimo, pedir lo que se te antoje, no dejar nada y siempre, siempre, pedir postre. 🍕🍨 Las inventamos nosotros, pero se cumplen. Ven hoy a Cancino o pide por delivery.

NECESITAMOS: un grupo de amigos o el equipo con buena onda, la mesa llena, el crumble con helado y el pastel de cacao, y luz cálida.

REFERENCIAS
Amigos comiendo pizza: https://www.pinterest.com/search/pins/?q=friends%20eating%20pizza%20candid
Postre para compartir: https://www.pinterest.com/search/pins/?q=sharing%20dessert%20restaurant%20table
Frases a mano sobre retrato: https://www.pinterest.com/search/pins/?q=handwritten%20quote%20over%20portrait%20photo`,
};

/**
 * «Lo que pide el equipo» como la referencia de Franca (18 nov 2026): cada persona del equipo, a
 * color, con su rebanada favorita y su pedido escrito encima.
 */
export const CANCINO_TEAM_ORDERS = {
  notes: `Post carrusel · 4 a 6 fotos, una por persona

HOOK: en la primera foto, alguien del equipo muerde su pizza favorita y mira a cámara.
Texto: «¿QUÉ PIDE EL EQUIPO?»

LAS FOTOS
1. Cada persona del equipo (cocina, barra y salón) con su rebanada favorita en la mano, a color, en su lugar: la cocina, una mesa o la barra.
2. Encima, su nombre y su pedido en letra blanca simple y en minúscula, por ejemplo «gus prefiere la pepperoni».
3. Que la marca se vea sola: el delantal, la playera o el plato de Cancino.
4. Algún detalle personal en el texto, como «maría ángeles no cambia la margherita… ni su felix».
5. Última foto: el equipo junto, con el texto «¿y tú qué pides?».

ESTILO: fotos a color con la luz cálida del local, verticales, gente real y cómoda. El texto blanco, simple y en minúscula, sobre la foto, como en la referencia.

COPY: Le preguntamos al equipo qué pide cuando le toca ser cliente. 🍕 Gus no suelta la pepperoni, María Ángeles no cambia la margherita y Mary va por la prosciutto. ¿Y tú cuál pides? Ven hoy a Cancino o pide por delivery.

NECESITAMOS: 4 a 6 personas del equipo que se animen, su pizza favorita recién salida y saber qué pide cada uno antes del shoot.

REFERENCIAS
Retratos del equipo: https://www.pinterest.com/search/pins/?q=restaurant%20staff%20portrait%20candid`,
  images: [1, 2, 3].map((n) => `/referencias/cancino-equipo-${n}.jpg`),
};

/** Idea de Franca (18 nov 2026): la playera blanca «PIZZA SIEMPRE» del rebranding. */
export const CANCINO_TSHIRT_IDEA: Idea = {
  id: "seed-idea-playera-pizza-siempre",
  project: "cancino",
  title: "Playera blanca «PIZZA SIEMPRE»",
  notes: `Post carrusel · 4 a 5 fotos

HOOK: alguien con la playera blanca “PIZZA SIEMPRE” en letras rojas, apoyado en una pared clara, mirando de lado.
Texto: «HAY COSAS QUE CAMBIAN, PIZZA SIEMPRE.»

LAS FOTOS
1. Retrato con la playera, de cerca, como en la presentación del rebranding (pared rosa clara o una pared del local).
2. El equipo con la playera puesta en la cocina, la barra y el salón (se puede hacer en el shoot de “Lo que pide el equipo”).
3. Alguien comiendo una rebanada con la playera, sin miedo a la salsa.
4. La playera doblada sobre la mesa junto a una pizza, vista desde arriba.
5. Cierre con la frase completa: «plan de siempre. los de siempre. donde siempre. pizza siempre.»

ESTILO: fotos a color con luz natural y gente real. La playera blanca con “PIZZA SIEMPRE” en rojo Cancino, letra gruesa en dos líneas.

COPY: Hay cosas que cambian, pizza siempre. 🍕 Plan de siempre, los de siempre, donde siempre. Te esperamos en Cancino o pide por delivery.

NECESITAMOS: mandar a hacer las playeras (blancas, “PIZZA SIEMPRE” en rojo al frente), 3 o 4 personas que las usen, una pared clara y pizzas recién salidas. Confirmar con Cancino si la playera se va a vender o es solo para el equipo.

REFERENCIAS
Playeras de restaurante con letras rojas: https://www.pinterest.com/search/pins/?q=restaurant%20merch%20white%20t%20shirt%20red%20letters`,
  link: "",
  pillar: null,
  shootId: null,
  done: false,
  createdAt: Date.UTC(2026, 10, 18, 20, 10),
};

/** Idea de Franca (18 nov 2026), de su presentación: cada pizza tiene su personalidad. */
export const CANCINO_PERSONALITIES_IDEA: Idea = {
  id: "seed-idea-personalidades-pizza",
  project: "cancino",
  title: "Personalidades de una pizza",
  notes: `Post carrusel · 5 o 6 láminas, una por pizza

HOOK: la primera lámina con el título en la etiqueta amarilla, como en la presentación.
Texto: «¿QUÉ PIZZA ERES?»

LAS LÁMINAS
1. Cada lámina partida en dos: arriba una persona que tiene la personalidad de esa pizza, abajo la pizza de cerca.
2. Al medio, la personalidad en una etiqueta negra con letra blanca a mano.
3. Margherita: «La todo bien». Tranquila, sin complicarse.
4. Diávola: «Spicy». Fiesta, leopardo, rojo y flash.
5. Rústica: «Bohemia sin pretensiones». De casa, de campo: delantal, cuadrillé y cocina.
6. Funghi: «Todo fluye». Las manos en la masa y cero prisa.
7. La que sigue: «Ahorita ahorita». La que siempre llega, pero a su ritmo (elegir con Cancino cuál es).

ESTILO: fondo rojo Cancino y el título en la etiqueta amarilla «PERSONALIDADES DE UNA PIZZA», como en tu presentación. Arriba la persona con su ropa y su lugar contando la personalidad; abajo la pizza a color; la etiqueta negra al medio.

COPY: Cada pizza tiene su personalidad. 🍕 La Margherita es la todo bien, la Diávola es spicy y la Rústica es de casa, de campo. ¿Tú cuál eres? Ven a descubrirlo a Cancino o pide por delivery.

NECESITAMOS: elegir con Cancino 5 o 6 pizzas y su personalidad, una persona por personalidad (del equipo o amigos) con ropa que la cuente, y una foto de cada pizza de cerca.

REFERENCIAS
Diávola, spicy: https://www.pinterest.com/search/pins/?q=leopard%20print%20party%20flash%20aesthetic
Rústica, de casa y de campo: https://www.pinterest.com/search/pins/?q=rustic%20bohemian%20apron%20kitchen%20outfit`,
  link: "",
  pillar: "Pizza",
  shootId: null,
  done: false,
  createdAt: Date.UTC(2026, 10, 18, 20, 30),
};

/** Idea de Franca (18 nov 2026): la maple tocino para publicar en invierno, como su carrusel. */
export const CANCINO_MAPLE_IDEA: Idea = {
  id: "seed-idea-maple-tocino-invierno",
  project: "cancino",
  title: "La maple tocino sabe a invierno",
  notes: `Post carrusel · 5 fotos

HOOK: la pizza en la mano, recién salida, con la frase en rojo siguiendo la curva de la charola.
Texto: «LA MAPLE TOCINO SABE A INVIERNO»

LAS FOTOS
1. La pizza en la mano, afuera o junto al horno. Texto: «La maple tocino sabe a invierno»
2. De cerca: la pancetta caramelizada, el cebollín y el hilo de miel de maple cayendo. Texto: «Zoom con vapor incluido»
3. Sobre el sillón de cuero o una mesa con luz cálida. Texto: «La regla de la temporada: se comparte o no cuenta.»
4. La espátula poniendo el huevo estrellado encima. Texto: «¿Con huevito?»
5. Cierre: la pizza con huevito, lista para compartir. Texto: «No hay bordes que sobrevivan a esta»

OTRAS FRASES (para cambiar o sumar)
1. Esta pizza abriga.
2. Afuera hace frío, aquí hay maple.
3. Huevito encima, invierno resuelto.
4. Dulce, salada y calientita. Como debe ser.
5. El frío se arregla con una rebanada.

ESTILO: como la serie de temporada (la huitlacoche sabe a otoño): frases cortas en rojo Cancino encima de la foto, luz cálida y baja, vapor y ropa de invierno (suéter, mangas largas).

COPY: La maple tocino sabe a invierno: pancetta caramelizada, cebollín y miel de maple. 🍕 Pídela con o sin huevo estrellado. Ven hoy a Cancino o pide por delivery.

NECESITAMOS: la pizza recién salida (con y sin huevo), miel de maple extra para el hilo, una espátula, el sillón de cuero o una mesa con luz cálida, y alguien con suéter.`,
  link: "",
  images: [1, 2, 3, 4].map((n) => `/referencias/cancino-maple-${n}.jpg`),
  pillar: "Pizza",
  shootId: null,
  done: false,
  createdAt: Date.UTC(2026, 10, 18, 20, 50),
};

/**
 * Fechas de los posts de Cancino como estaban antes de apretar «Reordenar» por error (18 nov 2026,
 * según el calendario de esa mañana), y lo que Franca confirmó que ya se publicó en Instagram.
 */
export const CANCINO_DATES_V29: { title: string; date: string; status?: Post["status"] }[] = [
  { title: "Drink Tommy Marg · A esto sabe el viernes", date: "2026-10-23" },
  { title: "Pasta Salmon", date: "2026-10-26", status: "publicado" },
  { title: "PDM", date: "2026-11-01" },
  { title: "Comentarios Vegan", date: "2026-11-07", status: "publicado" },
  { title: "Non alc monday", date: "2026-11-09", status: "publicado" },
  { title: "Post PDM fotos", date: "2026-11-12", status: "publicado" },
  { title: "Drink Diageo", date: "2026-11-18", status: "publicado" },
  { title: "Papas Gajo", date: "2026-11-20" },
  { title: "Hola Atlantis", date: "2026-11-23" },
  { title: "Pizza, siempre", date: "2026-11-29" },
  { title: "Post año anterior, se vota con comentarios", date: "2026-12-02" },
  { title: "Teaser Concurso 2026", date: "2026-12-03" },
  { title: "Final Concurso PDM", date: "2026-12-06" },
];

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


// Lo último ya publicado en Issi (captura del grid, 12 nov 2026). Lo más nuevo primero.
const ISSI_FEED: [title: string, format: Format][] = [
  ["Bowl con aceite verde", "Foto"],
  ["Camarones", "Post carrusel"],
  ["Brownie con cuchillo", "Post carrusel"],
  ["Pintura de agaves", "Post carrusel"],
];

export const ISSI_POSTS: Post[] = ISSI_FEED.map(([title, format], i) => ({
  id: `seed-issi-${i}`,
  project: "issi",
  date: null,
  title,
  format,
  status: "publicado",
  pillar: null,
  caption: "",
  image: `/feed/issi-${i + 1}.jpg`,
  createdAt: 100 - i,
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
  posts.push(CANCINO_PINNED, ...CANCINO_HISTORY_POSTS, ...CRISSIS_POSTS, ...ISSI_POSTS);

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
        voice: CANCINO_VOICE,
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
        voice: CRISSIS_VOICE,
        postsPerWeek: 2,
        ...BRAND_COLORS.crissis,
      },
      {
        slug: "issi",
        name: "Issi",
        instagram: "issi_rest",
        bg: "#f8f6e6",
        ...BRAND_COLORS.issi,
        monthlyGoal: 12,
        pillars: ISSI_PILLARS,
        voice: ISSI_VOICE,
      },
    ],
    posts,
    notes,
  };
}
