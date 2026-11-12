"use client";

import type { jsPDF } from "jspdf";
import { feedPosts } from "@/components/FeedTile";
import { statusColor } from "@/components/Status";
import {
  MONTHS,
  WEEKDAYS,
  dateKey,
  daysInMonth,
  leadingBlanks,
  monthKey,
  shortDate,
  todayKey,
  weekdayOf,
} from "./dates";
import { readLocal } from "./images";
import { INSIGHT_FIELDS, change, formatNumber } from "./insights";
import { linkUrl } from "./media";
import type { Report } from "./report";
import { STATUSES, STATUS_LABEL, paletteOf, type Post, type Project } from "./types";

const MARGIN = 12;
const INK = "#1d1818";
const GRAPHITE = "#6e6a6a";
const LINE = "#dddada";

// La letra del PDF no tiene emojis: se quitan para que no salgan cuadros raros.
const clean = (text: string) =>
  text
    .replace(/[^\n\x20-\xFF‘’“”–—…•]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();

async function newDocument(orientation: "portrait" | "landscape") {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
  doc.setFont("helvetica");
  return doc;
}

/** Recorta una imagen o un cuadro de video a la medida, como en el feed. */
function cropped(source: CanvasImageSource, from: [number, number], width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const scale = Math.max(width / from[0], height / from[1]);
  const w = from[0] * scale;
  const h = from[1] * scale;
  canvas.getContext("2d")!.drawImage(source, (width - w) / 2, (height - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

const fileBlob = (id: string) =>
  id.startsWith("/") ? fetch(id).then((r) => (r.ok ? r.blob() : null)) : readLocal(id);

/** Foto recortada a la medida del cuadro, lista para ponerla en el PDF. */
async function picture(id: string | null, width: number, height: number) {
  if (!id) return null;
  try {
    const blob = await fileBlob(id);
    if (!blob) return null;
    const bitmap = await createImageBitmap(blob);
    return cropped(bitmap, [bitmap.width, bitmap.height], width, height);
  } catch {
    return null;
  }
}

/** Primer cuadro del video: lo que muestra el feed cuando el post no tiene foto de portada. */
async function videoPicture(post: Post, width: number, height: number) {
  const file = post.files?.find((f) => f.type.startsWith("video/"));
  return file ? videoFrame(file.id, width, height) : null;
}

/** Un cuadro de un video guardado, recortado a la medida. Null si el navegador no puede abrirlo. */
async function videoFrame(id: string, width: number, height: number) {
  const file = { id };
  const local = file.id.startsWith("/") ? null : await readLocal(file.id);
  if (!file.id.startsWith("/") && !local) return null;
  const url = local ? URL.createObjectURL(local) : file.id;
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise((ok, fail) => {
      video.onloadeddata = ok;
      video.onerror = fail;
      setTimeout(fail, 20_000);
    });
    video.currentTime = Math.min(0.1, video.duration / 2 || 0);
    await new Promise((ok) => {
      video.onseeked = ok;
      setTimeout(ok, 5000);
    });
    return cropped(video, [video.videoWidth, video.videoHeight], width, height);
  } catch {
    return null;
  } finally {
    if (local) URL.revokeObjectURL(url);
  }
}

/** La portada del post: su foto o, si no tiene o no abre, un cuadro de su video. */
const coverPicture = async (post: Post, width: number, height: number) =>
  (await picture(post.image, width, height)) ?? videoPicture(post, width, height);

function header(doc: jsPDF, title: string, subtitle: string) {
  doc.setTextColor(INK).setFont("helvetica", "bold").setFontSize(20);
  doc.text(clean(title), MARGIN, MARGIN + 7);
  doc.setTextColor(GRAPHITE).setFont("helvetica", "normal").setFontSize(10);
  doc.text(clean(subtitle), MARGIN, MARGIN + 13);
}

function fit(doc: jsPDF, text: string, width: number, lines: number) {
  const all = doc.splitTextToSize(clean(text), width) as string[];
  if (all.length <= lines) return all;
  const kept = all.slice(0, lines);
  kept[lines - 1] = `${kept[lines - 1].replace(/\s*\S{0,3}$/, "")}…`;
  return kept;
}

function legend(doc: jsPDF, project: Project, y: number) {
  const right = doc.internal.pageSize.getWidth() - MARGIN;
  doc.setFontSize(8).setFont("helvetica", "normal");
  let x = right;
  for (const status of [...STATUSES].reverse()) {
    const label = STATUS_LABEL[status];
    x -= doc.getTextWidth(label);
    doc.setTextColor(GRAPHITE).text(label, x, y);
    x -= 3;
    doc.setFillColor(statusColor(status, project)).circle(x, y - 1, 1.1, "F");
    x -= 5;
  }
}

const luminance = (hex: string) => {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

/** Colores de la marca para el PDF: el principal y uno claro para el fondo de las etiquetas. */
function brand(project: Project) {
  const strong = project.accent;
  const light = (c?: string) => !!c && luminance(c) > 0.6 && luminance(c) < 0.97;
  const soft = [project.statusColors?.listo, ...paletteOf(project)].find(
    (c) => light(c) && c !== strong,
  );
  // Un principal muy claro no se lee sobre el fondo: se usa tinta.
  return { strong: luminance(strong) > 0.75 ? INK : strong, soft: soft ?? "#f1f0ee" };
}

/** Etiqueta redondeada; `outline` = solo borde. Devuelve su ancho. */
function pill(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  color: string,
  fill: string | null,
  style: "bold" | "bolditalic",
) {
  doc.setFont("helvetica", style).setFontSize(8.5);
  const label = clean(text);
  const width = doc.getTextWidth(label) + (fill ? 8 : 11);
  if (fill) doc.setFillColor(fill).roundedRect(x, y, width, 7, 3.5, 3.5, "F");
  else {
    doc.setDrawColor(color).setLineWidth(0.35).roundedRect(x, y, width, 7, 3.5, 3.5, "S");
    doc.setFillColor(color).circle(x + 4, y + 3.5, 0.7, "F");
  }
  doc.setTextColor(color).text(label, x + (fill ? 4 : 6.5), y + 4.8);
  return width;
}

/**
 * Una publicación por fila, en orden de publicación y sobre fondo blanco: día, etiquetas con los
 * colores de la marca, la foto, el copy y, si es carrusel, el resto de sus fotos. Cuatro por hoja.
 */
async function cardPages(doc: jsPDF, project: Project, posts: Post[], title: string, subtitle: string) {
  const { strong, soft } = brand(project);
  const rowHeight = 62;
  const top = MARGIN + 22;
  const photoX = MARGIN + 50;
  const photoWidth = 44;
  const photoHeight = 55;
  const textX = photoX + photoWidth + 8;
  const textWidth = 210 - MARGIN - textX;
  const ordered = [...posts].sort(
    (a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.createdAt - b.createdAt,
  );
  const covers = await Promise.all(ordered.map((p) => coverPicture(p, 440, 550)));
  // El resto del post, en miniatura: las otras fotos y un cuadro de cada video (con ▶).
  const extras = await Promise.all(
    ordered.map(async (p) => {
      const videos = (p.files ?? []).filter((f) => f.type.startsWith("video/"));
      // Si la portada salió del video (post sin foto), ese video no se repite abajo.
      const fromCover = !p.image && videos.length ? videos.slice(1) : videos;
      const photos = await Promise.all((p.slides ?? []).map((id) => picture(id, 120, 150)));
      const frames = await Promise.all(fromCover.map((f) => videoFrame(f.id, 120, 150)));
      return [
        ...photos.map((image) => ({ image, video: false })),
        // Un video que el navegador no puede abrir igual aparece, como cuadro gris con ▶.
        ...frames.map((image) => ({ image, video: true })),
      ]
        .filter((x): x is { image: string | null; video: boolean } => !!x.image || x.video)
        .slice(0, 5);
    }),
  );

  ordered.forEach((post, i) => {
    const slot = i % 4;
    if (slot === 0) {
      doc.addPage("a4", "portrait");
      doc.setFillColor(strong).circle(MARGIN + 2.5, MARGIN + 5.2, 2.5, "F");
      doc.setTextColor(INK).setFont("helvetica", "bold").setFontSize(18);
      doc.text(clean(title), MARGIN + 8, MARGIN + 7);
      doc.setTextColor(GRAPHITE).setFont("helvetica", "normal").setFontSize(10);
      doc.text(clean(subtitle), MARGIN + 8, MARGIN + 13);
    }
    const y = top + slot * rowHeight;

    // Columna izquierda: día grande, categoría, formato y título.
    const day = post.date
      ? `${weekdayOf(post.date)} ${Number(post.date.slice(8))} ${MONTHS[Number(post.date.slice(5, 7)) - 1].slice(0, 3).toUpperCase()}`
      : "SIN FECHA";
    doc.setFont("helvetica", "bold").setFontSize(16).setTextColor("#a3a3a3");
    doc.text(clean(day), MARGIN, y + 8, { charSpace: 0.6 });
    let tagY = y + 13;
    if (post.pillar) {
      pill(doc, post.pillar, MARGIN, tagY, strong, soft, "bold");
      tagY += 10;
    }
    pill(doc, post.format, MARGIN, tagY, strong, null, "bolditalic");
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(INK);
    doc.text(fit(doc, post.title || "", 44, 3), MARGIN, tagY + 16);

    // Foto de portada.
    const cover = covers[i];
    doc.setFillColor("#ececec").rect(photoX, y + 2, photoWidth, photoHeight, "F");
    if (cover) doc.addImage(cover, "JPEG", photoX, y + 2, photoWidth, photoHeight);
    const pieces =
      (post.image ? 1 : 0) +
      (post.slides ?? []).length +
      (post.files ?? []).filter((f) => f.type.startsWith("video/")).length;
    if (pieces > 1) {
      const count = `1/${pieces}`;
      doc.setFont("helvetica", "bold").setFontSize(7);
      const w = doc.getTextWidth(count) + 4;
      doc.setFillColor(INK).roundedRect(photoX + photoWidth - w - 2, y + 4, w, 5, 2.5, 2.5, "F");
      doc.setTextColor("#ffffff").text(count, photoX + photoWidth - w, y + 7.4);
    }
    const video = linkUrl(post.videoLink);
    if (video) {
      doc.link(photoX, y + 2, photoWidth, photoHeight, { url: video });
      doc.setFont("helvetica", "bold").setFontSize(7.5);
      const w = doc.getTextWidth("Ver video") + 6;
      doc.setFillColor("#ffffff").roundedRect(photoX + (photoWidth - w) / 2, y + photoHeight - 6, w, 5.5, 2.75, 2.75, "F");
      doc.setTextColor(INK).text("Ver video", photoX + photoWidth / 2, y + photoHeight - 2.3, { align: "center" });
    }

    // Copy y, si es carrusel, el resto de las fotos debajo.
    const thumbs = extras[i];
    doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(post.caption ? INK : GRAPHITE);
    const lines = post.caption ? fit(doc, post.caption, textWidth, thumbs.length ? 7 : 12) : ["sin copy todavía"];
    doc.text(lines, textX, y + 6);
    thumbs.forEach((thumb, k) => {
      const tx = textX + k * 14;
      if (thumb.image) doc.addImage(thumb.image, "JPEG", tx, y + 41, 12, 15);
      else doc.setFillColor("#8a8a8a").rect(tx, y + 41, 12, 15, "F");
      if (thumb.video) {
        // Triángulo de "play" para que se note que es un video.
        doc.setFillColor("#ffffff");
        doc.triangle(tx + 4.6, y + 46, tx + 4.6, y + 51, tx + 8.4, y + 48.5, "F");
      }
    });

    if (slot < 3 && i < ordered.length - 1) {
      doc.setDrawColor("#e6e6e6").setLineWidth(0.3);
      doc.line(MARGIN, y + rowHeight - 2.5, 210 - MARGIN, y + rowHeight - 2.5);
    }
  });
}


const fileName = (project: Project, what: string) => `${project.name} - ${what}.pdf`;

type FeedItem = { post: Post; label?: string };

/** Cuántos posts anteriores se muestran, para ver cómo empalma con lo que ya está. */
const PREVIOUS = 3;

/**
 * Con mes: los posts de ese mes y los 3 anteriores a que empiece.
 * Sin mes: todo lo nuevo y los últimos 3 ya publicados.
 */
function feedItems(project: Project, posts: Post[], months?: string[]): FeedItem[] {
  const today = todayKey();
  const all = feedPosts(posts, project.slug);
  const isNew = (p: Post) => p.status !== "publicado";
  const label = (p: Post) =>
    p.date ? `${p.date < today ? "" : "Nuevo · "}${shortDate(p.date)}` : "Nuevo · sin fecha";
  const item = (post: Post) => ({ post, label: isNew(post) ? label(post) : undefined });
  if (months?.length) {
    const first = [...months].sort()[0];
    return [
      ...all.filter((p) => months.some((m) => p.date?.startsWith(m))),
      ...all
        .filter((p) => p.date && p.date < first)
        .sort((x, y) => y.date!.localeCompare(x.date!))
        .slice(0, PREVIOUS),
    ].map(item);
  }
  return [...all.filter(isNew), ...all.filter((p) => !isNew(p)).slice(0, PREVIOUS)].map(item);
}

const feedSubtitle = (project: Project, items: FeedItem[]) => {
  const count = items.filter((item) => item.label).length;
  const handle = project.instagram || project.name.toLowerCase();
  return `@${handle} · ${count} ${count === 1 ? "post nuevo" : "posts nuevos"} sobre el feed actual`;
};

/** Grid del feed como lo verá el cliente: primero lo nuevo, después lo ya publicado. */
async function feedPages(doc: jsPDF, project: Project, items: FeedItem[]) {
  const subtitle = feedSubtitle(project, items);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const gap = 1.5;
  const top = MARGIN + 20;
  // Hasta 5 filas entran en una página: los cuadros se achican en vez de saltar a otra hoja.
  const rows = Math.min(5, Math.max(3, Math.ceil(items.length / 3)));
  const fullWidth = (pageWidth - MARGIN * 2 - gap * 2) / 3;
  const roomHeight = (pageHeight - MARGIN - top - gap * (rows - 1)) / rows;
  const height = Math.min((fullWidth * 4) / 3, roomHeight);
  const width = (height * 3) / 4;
  const left = (pageWidth - width * 3 - gap * 2) / 2;
  const images = await Promise.all(items.map(({ post }) => coverPicture(post, 540, 720)));

  header(doc, `${project.name} · Feed`, subtitle);
  let y = top;
  items.forEach(({ post, label }, i) => {
    if (i && i % 3 === 0) y += height + gap;
    if (y + height > pageHeight - MARGIN) {
      doc.addPage("a4", "portrait");
      y = MARGIN;
    }
    const x = left + (i % 3) * (width + gap);
    const image = images[i];
    doc.setFillColor("#ececec").rect(x, y, width, height, "F");
    if (image) doc.addImage(image, "JPEG", x, y, width, height);
    else {
      doc.setTextColor(GRAPHITE).setFontSize(9);
      doc.text(fit(doc, post.title || "Sin foto", width - 8, 3), x + 4, y + height / 2);
    }
    const video = linkUrl(post.videoLink);
    if (video) {
      doc.link(x, y, width, height, { url: video });
      doc.setFont("helvetica", "bold").setFontSize(8);
      const text = "Ver video";
      const pill = doc.getTextWidth(text) + 6;
      doc.setFillColor("#ffffff").roundedRect(x + (width - pill) / 2, y + height - 9, pill, 6, 3, 3, "F");
      doc.setTextColor(INK).text(text, x + width / 2, y + height - 4.8, { align: "center" });
      doc.setFont("helvetica", "normal");
    }
    if (label) {
      doc.setFont("helvetica", "bold").setFontSize(7.5);
      const text = clean(label);
      doc.setFillColor(INK).rect(x + 2, y + 2, doc.getTextWidth(text) + 4, 5, "F");
      doc.setTextColor("#ffffff").text(text, x + 4, y + 5.5);
      doc.setFont("helvetica", "normal");
    }
  });
}

export async function feedPdf(project: Project, posts: Post[]) {
  const doc = await newDocument("portrait");
  const items = feedItems(project, posts);
  await feedPages(doc, project, items);
  const fresh = items.filter((item) => item.label).map((item) => item.post);
  await cardPages(doc, project, fresh, "Lo nuevo", project.name);
  doc.save(fileName(project, "Feed"));
}

/** Reporte mensual para el cliente: metas, categorías, formatos e historia. */
export async function reportPdf(project: Project, report: Report, year: number, month: number) {
  const doc = await newDocument("portrait");
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2;
  const monthName = MONTHS[month][0].toUpperCase() + MONTHS[month].slice(1);
  header(doc, `${project.name} · Reporte`, `${monthName} ${year}`);

  let y = MARGIN + 28;
  const stats: [string, string][] = [
    [`${report.feed}/${report.goal}`, "Posts del mes"],
    [String(report.published), "Publicados"],
    [String(report.stories), "Stories"],
  ];
  stats.forEach(([value, label], i) => {
    const x = MARGIN + (i * width) / stats.length;
    doc.setFont("helvetica", "normal").setFontSize(24).setTextColor(INK).text(value, x, y);
    doc.setFontSize(9).setTextColor(GRAPHITE).text(label, x, y + 6);
  });
  y += 18;

  const title = (text: string) => {
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(INK).text(clean(text), MARGIN, y);
    y += 6;
  };
  const bar = (label: string, value: string, share: number) => {
    doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(INK);
    doc.text(clean(label), MARGIN, y);
    doc.text(value, MARGIN + width, y, { align: "right" });
    doc.setFillColor("#e6e4e4").rect(MARGIN, y + 1.5, width, 1.8, "F");
    doc.setFillColor(INK).rect(MARGIN, y + 1.5, width * Math.min(1, share), 1.8, "F");
    y += 8;
  };

  if (report.pillars.length) {
    title("Por categoría");
    report.pillars.forEach((p) =>
      bar(p.name, `${p.count}/${p.target}`, p.target ? p.count / p.target : 0),
    );
    y += 4;
  }
  if (report.formats.length) {
    title("Por formato");
    report.formats.forEach((f) =>
      bar(f.name, String(f.count), report.total ? f.count / report.total : 0),
    );
    y += 4;
  }

  title("Últimos 6 meses");
  const peak = Math.max(report.goal, ...report.history.map((h) => h.count), 1);
  const chart = 26;
  const column = width / 6;
  report.history.forEach((h, i) => {
    const x = MARGIN + i * column;
    const height = (h.count / peak) * chart;
    doc.setFillColor(INK).rect(x + 4, y + chart - height, column - 8, Math.max(height, 0.4), "F");
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(INK);
    doc.text(String(h.count), x + column / 2, y + chart - height - 1.5, { align: "center" });
    doc.setTextColor(GRAPHITE).text(h.label, x + column / 2, y + chart + 4.5, { align: "center" });
  });
  y += chart + 13;

  title("Para mejorar");
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(INK);
  for (const text of report.advice.length ? report.advice : ["Todo al día: el mes cumple sus metas."]) {
    doc.text(clean(`• ${text}`), MARGIN, y);
    y += 5.5;
  }

  // Estadísticas de Instagram (de las capturas), si se subieron.
  const key = monthKey(year, month);
  const data = project.insights?.[key];
  if (data) {
    const last = new Date(year, month - 1, 1);
    const before = project.insights?.[monthKey(last.getFullYear(), last.getMonth())];
    const pageHeight = doc.internal.pageSize.getHeight();
    const room = (needed: number) => {
      if (y + needed > pageHeight - MARGIN) {
        doc.addPage();
        y = MARGIN + 6;
      }
    };
    y += 6;
    room(40);
    title("Instagram");
    const numbers = INSIGHT_FIELDS.filter(([field]) => data[field] != null);
    const perRow = 4;
    numbers.forEach(([field, label], i) => {
      if (i % perRow === 0 && i) y += 17;
      if (i % perRow === 0) room(17);
      const x = MARGIN + ((i % perRow) * width) / perRow;
      doc.setFont("helvetica", "normal").setFontSize(16).setTextColor(INK);
      doc.text(formatNumber(data[field]!), x, y + 5);
      doc.setFontSize(8.5).setTextColor(GRAPHITE).text(clean(label), x, y + 10);
      const diff = change(data[field], before?.[field]);
      if (diff) doc.setFontSize(7.5).text(`${diff} vs mes anterior`, x, y + 14);
    });
    if (numbers.length) y += 22;
    const paragraph = (text: string, size = 10) => {
      doc.setFont("helvetica", "normal").setFontSize(size).setTextColor(INK);
      for (const line of doc.splitTextToSize(clean(text), width) as string[]) {
        room(6);
        doc.text(line, MARGIN, y);
        y += size * 0.5;
      }
    };
    if (data.summary) {
      paragraph(data.summary);
      y += 4;
    }
    if (data.topPosts?.length) {
      room(14);
      title("Lo que mejor funcionó");
      data.topPosts.forEach((p) => paragraph(`• ${p.description} · ${p.result}`));
      y += 4;
    }
    if (data.tips?.length) {
      room(14);
      title("Ideas para el próximo mes");
      data.tips.forEach((t) => paragraph(`• ${t}`));
    }
  }

  doc.save(fileName(project, `Reporte ${monthName} ${year}`));
}

type MonthRef = { year: number; month: number };

const titleOf = (months: MonthRef[]) => {
  const names = months.map(({ year, month }, i) => {
    const name = MONTHS[month][0].toUpperCase() + MONTHS[month].slice(1);
    const nextYear = months[i + 1]?.year;
    return nextYear === year ? name : `${name} ${year}`;
  });
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} y ${names.at(-1)}` : names[0];
};

/** El mes en cuadrícula, en una hoja apaisada. */
async function monthGrid(doc: jsPDF, project: Project, allPosts: Post[], { year, month }: MonthRef) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const monthName = MONTHS[month][0].toUpperCase() + MONTHS[month].slice(1);
  const key = monthKey(year, month);
  const dated = allPosts
    .filter((p) => p.date?.startsWith(key))
    .sort((a, b) => a.date!.localeCompare(b.date!) || a.createdAt - b.createdAt);
  const thumbs = new Map(
    await Promise.all(dated.map(async (p) => [p.id, await coverPicture(p, 240, 320)] as const)),
  );

  header(doc, `${project.name} · ${monthName} ${year}`, `Calendario de contenido · ${dated.length} publicaciones`);
  legend(doc, project, MARGIN + 13);

  const blanks = leadingBlanks(year, month);
  const total = daysInMonth(year, month);
  const rows = Math.ceil((blanks + total) / 7);
  const top = MARGIN + 18;
  const cellWidth = (pageWidth - MARGIN * 2) / 7;
  const headHeight = 6;
  const cellHeight = (pageHeight - MARGIN - top - headHeight) / rows;

  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(GRAPHITE);
  WEEKDAYS.forEach((day, i) => doc.text(day, MARGIN + i * cellWidth + 1.5, top + 4));

  const thumbWidth = 8;
  const thumbHeight = (thumbWidth * 4) / 3;
  doc.setDrawColor(LINE).setLineWidth(0.2);
  for (let i = 0; i < rows * 7; i++) {
    const x = MARGIN + (i % 7) * cellWidth;
    const y = top + headHeight + Math.floor(i / 7) * cellHeight;
    doc.rect(x, y, cellWidth, cellHeight);
    const day = i - blanks + 1;
    if (day < 1 || day > total) continue;

    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(INK);
    doc.text(String(day), x + 1.5, y + 4);
    const list = dated.filter((p) => p.date === dateKey(year, month, day));
    const room = Math.max(1, Math.floor((cellHeight - 6) / (thumbHeight + 1)));
    const shown = list.length > room ? room - 1 || 1 : room;
    list.slice(0, shown).forEach((post, k) => {
      const rowY = y + 5.5 + k * (thumbHeight + 1);
      const textX = x + 1.5 + thumbWidth + 1.5;
      const image = thumbs.get(post.id);
      doc.setFillColor("#ececec").rect(x + 1.5, rowY, thumbWidth, thumbHeight, "F");
      if (image) doc.addImage(image, "JPEG", x + 1.5, rowY, thumbWidth, thumbHeight);
      const video = linkUrl(post.videoLink);
      if (video) doc.link(x + 1.5, rowY, cellWidth - 3, thumbHeight, { url: video });
      doc.setFillColor(statusColor(post.status, project));
      doc.circle(textX + 0.9, rowY + 1.4, 0.9, "F");
      doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(INK);
      doc.text(fit(doc, post.title || post.format, cellWidth - thumbWidth - 6.5, 2), textX + 2.6, rowY + 2.2);
      doc.setFontSize(6).setTextColor(GRAPHITE);
      doc.text(fit(doc, post.format, cellWidth - thumbWidth - 4, 1), textX, rowY + thumbHeight - 0.5);
    });
    if (list.length > shown) {
      doc.setFontSize(6.5).setTextColor(GRAPHITE);
      doc.text(`+${list.length - shown} más`, x + cellWidth - 1.5, y + 4, { align: "right" });
    }
  }
}

/**
 * Todo en un solo PDF, para uno o varios meses: cada mes en cuadrícula, el feed (con los 3 posts
 * anteriores al primer mes) y una fila por publicación.
 */
export async function calendarPdf(project: Project, allPosts: Post[], picked: MonthRef[]) {
  const months = [...picked].sort((a, b) => a.year - b.year || a.month - b.month);
  const keys = months.map((m) => monthKey(m.year, m.month));
  const doc = await newDocument("landscape");
  for (const [i, ref] of months.entries()) {
    if (i) doc.addPage("a4", "landscape");
    await monthGrid(doc, project, allPosts, ref);
  }
  const dated = allPosts.filter((p) => p.date && keys.some((k) => p.date!.startsWith(k)));
  const title = titleOf(months);

  doc.addPage("a4", "portrait");
  await feedPages(doc, project, feedItems(project, allPosts, keys));
  // En las filas solo lo que falta subir: lo ya publicado se ve en el mes y en el feed.
  const pending = dated.filter((p) => p.status !== "publicado");
  if (pending.length)
    await cardPages(doc, project, pending, title, `${project.name} · por publicar`);

  doc.save(fileName(project, `Calendario ${title}`));
}
