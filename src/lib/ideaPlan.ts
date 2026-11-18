// Lee las notas de una idea (texto libre) y las ordena para mostrarlas bonitas:
// formato arriba, secciones en mayúscula (HOOK, TOMAS, AUDIO, COPY…), pasos numerados
// y los textos en pantalla entre «comillas».

export type PlanLine =
  | { kind: "text"; text: string }
  | { kind: "step"; n: string; text: string }
  | { kind: "overlay"; label: string; text: string };

export type PlanSection = { title: string; sub: string; lines: PlanLine[] };

export type Plan = {
  /** Ej. «Reel vertical 9:16 · 10–15 s». */
  format: string;
  /** Lo que va antes de la primera sección. */
  intro: PlanLine[];
  sections: PlanSection[];
};

const FORMAT = /^((?:reel|post|carrusel|historia|story|video|tiktok)\b[^.(]*)(.*)$/i;
// Una línea en mayúsculas, con o sin «(detalle)», termina en «:» o sola.
const HEADING = /^([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ ]{2,}?)\s*(?:\(([^)]*)\))?\s*(?::\s*(.*))?$/;
const STEP = /^(\d+)[.)]\s+(.*)$/;
const OVERLAY = /^(texto(?: [a-záéíóúñ]+)?)\s*:\s*«(.+)»\s*$/i;

const sentence = (text: string) => text.charAt(0) + text.slice(1).toLowerCase();
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function line(text: string): PlanLine {
  const overlay = text.match(OVERLAY);
  if (overlay) return { kind: "overlay", label: sentence(overlay[1]), text: overlay[2] };
  const step = text.match(STEP);
  if (step) return { kind: "step", n: step[1], text: step[2] };
  return { kind: "text", text };
}

export function parsePlan(notes: string): Plan {
  const plan: Plan = { format: "", intro: [], sections: [] };
  const lines = notes
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const first = lines[0]?.match(FORMAT);
  if (first) {
    plan.format = first[1].trim();
    const rest = first[2]
      .replace(/^[.\s·]+/, "")
      .replace(/^\((.*)\)$/, "$1")
      .trim();
    if (rest) plan.intro.push({ kind: "text", text: capital(rest) });
    lines.shift();
  }

  let current: PlanSection | null = null;
  for (const text of lines) {
    const heading = text.match(HEADING);
    if (heading) {
      current = { title: sentence(heading[1].trim()), sub: heading[2] ?? "", lines: [] };
      plan.sections.push(current);
      if (heading[3]) current.lines.push(line(capital(heading[3])));
    } else (current ? current.lines : plan.intro).push(line(text));
  }
  return plan;
}

/** Lo que se ve en la tarjeta: de qué se trata el hook y su texto en pantalla. */
export function planPreview(plan: Plan) {
  const hook = plan.sections.find((s) => /^hook/i.test(s.title));
  const lines = hook?.lines ?? plan.intro.concat(plan.sections[0]?.lines ?? []);
  const text = lines.find((l) => l.kind !== "overlay")?.text ?? "";
  const overlay = lines.find((l) => l.kind === "overlay")?.text ?? "";
  return { text, overlay };
}

/** Un link de referencia: «Masa al aire a contraluz» + su dirección. */
export type RefLink = { label: string; href: string };

const LINK = /https?:\/\/\S+/;
const IMAGE = /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i;

/** Link que es directo a una foto: se muestra como foto, no como tarjeta. */
export const isImageLink = (href: string) => IMAGE.test(href);

/**
 * Separa las referencias del resto del plan, para mostrarlas aparte en la lámina: la sección
 * REFERENCIAS (cada línea «nombre: link»), el link de referencia de la idea y las fotos por link.
 */
export function splitReferences(plan: Plan, link = "") {
  const links: RefLink[] = [];
  const notes: string[] = [];
  const add = (label: string, href: string) => {
    if (!links.some((l) => l.href === href)) links.push({ label, href });
  };
  if (link.trim()) add("", link.trim());

  const sections = plan.sections.filter((section) => {
    if (!/^referencia/i.test(section.title)) return true;
    for (const l of section.lines) {
      const href = l.text.match(LINK)?.[0];
      if (!href) {
        notes.push(l.text);
        continue;
      }
      add(
        l.text
          .replace(href, "")
          .replace(/[\s:–—-]+$/, "")
          .trim(),
        href,
      );
    }
    return false;
  });

  return {
    plan: { ...plan, sections },
    links: links.filter((l) => !isImageLink(l.href)),
    images: links.filter((l) => isImageLink(l.href)).map((l) => l.href),
    notes,
  };
}

/** Nombre del sitio de un link: «Pinterest», «Instagram», «Tiktok»… */
export function siteName(href: string) {
  try {
    const site = new URL(href).hostname.replace(/^(www|m|vm)\./, "").split(".")[0];
    return site.charAt(0).toUpperCase() + site.slice(1);
  } catch {
    return "Link";
  }
}

/** «Pinterest · staff meal» en vez del link largo. */
export function linkLabel(href: string) {
  try {
    const query = new URL(href).searchParams.get("q");
    return query ? `${siteName(href)} · ${query}` : siteName(href);
  } catch {
    return href;
  }
}
