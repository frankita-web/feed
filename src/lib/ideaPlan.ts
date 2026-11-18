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
    const rest = first[2].replace(/^[.\s·]+/, "").replace(/^\((.*)\)$/, "$1").trim();
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
