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
} from "./dates";
import { readLocal } from "./images";
import { linkUrl } from "./media";
import type { Report } from "./report";
import { STATUSES, STATUS_LABEL, type Post, type Project } from "./types";

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

/** Foto recortada a la medida del cuadro, lista para ponerla en el PDF. */
async function picture(id: string | null, width: number, height: number) {
  if (!id) return null;
  try {
    const blob = id.startsWith("/")
      ? await fetch(id).then((r) => (r.ok ? r.blob() : null))
      : await readLocal(id);
    if (!blob) return null;
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const scale = Math.max(width / bitmap.width, height / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    canvas.getContext("2d")!.drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}

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

/** Una publicación por bloque: datos, copy y todas sus fotos, para entender qué se publicará. */
async function detailPages(doc: jsPDF, posts: Post[], title: string, subtitle: string) {
  // Siempre en vertical, aunque la página anterior sea el mes apaisado.
  const pageWidth = 210;
  const pageHeight = 297;
  const width = pageWidth - MARGIN * 2;
  const photo = 34;
  const photoHeight = (photo * 4) / 3;
  const gap = 2;
  const perRow = Math.floor((width + gap) / (photo + gap));
  let y = pageHeight;

  for (const post of posts) {
    const ids = [post.image, ...(post.slides ?? [])].filter((id): id is string => !!id);
    const images = (await Promise.all(ids.map((id) => picture(id, 360, 480)))).filter(
      (image): image is string => !!image,
    );
    doc.setFont("helvetica", "normal").setFontSize(9.5);
    const caption = post.caption ? fit(doc, post.caption, width, 5) : [];
    const rows = Math.ceil(images.length / perRow);
    const height = 12 + caption.length * 4.2 + rows * (photoHeight + gap) + 6;

    if (y + height > pageHeight - MARGIN) {
      doc.addPage("a4", "portrait");
      header(doc, title, subtitle);
      y = MARGIN + 20;
    }

    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(INK);
    doc.text(fit(doc, post.title || "Sin título", width, 1), MARGIN, y + 4);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(GRAPHITE);
    const facts = clean(
      [post.date && shortDate(post.date), post.time, post.format, post.pillar, STATUS_LABEL[post.status]]
        .filter(Boolean)
        .join(" · "),
    );
    doc.text(facts, MARGIN, y + 9);
    const video = linkUrl(post.videoLink);
    if (video) {
      doc.setFont("helvetica", "bold").setTextColor("#0b57d0");
      doc.textWithLink("Ver video", MARGIN + doc.getTextWidth(facts) + 5, y + 9, { url: video });
      doc.setFont("helvetica", "normal");
    }
    let next = y + 12;
    if (caption.length) {
      doc.setFontSize(9.5).setTextColor(INK);
      doc.text(caption, MARGIN, next + 2.5);
      next += caption.length * 4.2;
    }
    images.forEach((image, i) => {
      const x = MARGIN + (i % perRow) * (photo + gap);
      const rowY = next + 1 + Math.floor(i / perRow) * (photoHeight + gap);
      doc.addImage(image, "JPEG", x, rowY, photo, photoHeight);
      doc.setFillColor(INK).rect(x + 1, rowY + 1, 5, 4, "F");
      doc.setFont("helvetica", "bold").setFontSize(7).setTextColor("#ffffff");
      doc.text(String(i + 1), x + 3.5, rowY + 3.8, { align: "center" });
    });
    y += height;
  }
}

const fileName = (project: Project, what: string) => `${project.name} - ${what}.pdf`;

type FeedItem = { post: Post; label?: string };

/** Cuántos posts anteriores se muestran, para ver cómo empalma con lo que ya está. */
const PREVIOUS = 3;

/**
 * Con mes: los posts de ese mes y los 3 anteriores a que empiece.
 * Sin mes: todo lo nuevo y los últimos 3 ya publicados.
 */
function feedItems(project: Project, posts: Post[], month?: string): FeedItem[] {
  const today = todayKey();
  const all = feedPosts(posts, project.slug);
  const isNew = (p: Post) => p.status !== "publicado";
  const label = (p: Post) =>
    p.date ? `${p.date < today ? "Atrasado" : "Nuevo"} · ${shortDate(p.date)}` : "Nuevo · sin fecha";
  const item = (post: Post) => ({ post, label: isNew(post) ? label(post) : undefined });
  if (month)
    return [
      ...all.filter((p) => p.date?.startsWith(month)),
      ...all.filter((p) => p.date && p.date < month).slice(0, PREVIOUS),
    ].map(item);
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
  const images = await Promise.all(items.map(({ post }) => picture(post.image, 540, 720)));

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
  await detailPages(
    doc,
    items.filter((item) => item.label).map((item) => item.post),
    "Lo nuevo · Detalle",
    project.name,
  );
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
    [String(report.late), "Atrasados"],
    [String(report.stories), "Stories"],
  ];
  stats.forEach(([value, label], i) => {
    const x = MARGIN + (i * width) / 4;
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

  doc.save(fileName(project, `Reporte ${monthName} ${year}`));
}

/** Todo en un solo PDF: el mes en cuadrícula, el feed y el detalle de cada publicación. */
export async function calendarPdf(
  project: Project,
  posts: Post[],
  allPosts: Post[],
  year: number,
  month: number,
) {
  const doc = await newDocument("landscape");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const monthName = MONTHS[month][0].toUpperCase() + MONTHS[month].slice(1);
  const dated = posts
    .filter((p) => p.date)
    .sort((a, b) => a.date!.localeCompare(b.date!) || a.createdAt - b.createdAt);
  const thumbs = new Map(
    await Promise.all(
      dated.map(async (p) => [p.id, await picture(p.image, 240, 320)] as const),
    ),
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
    const key = dateKey(year, month, day);
    const list = dated.filter((p) => p.date === key);
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
      doc.text(
        fit(doc, post.title || post.format, cellWidth - thumbWidth - 6.5, 2),
        textX + 2.6,
        rowY + 2.2,
      );
      doc.setFontSize(6).setTextColor(GRAPHITE);
      doc.text(fit(doc, post.format, cellWidth - thumbWidth - 4, 1), textX, rowY + thumbHeight - 0.5);
    });
    if (list.length > shown) {
      doc.setFontSize(6.5).setTextColor(GRAPHITE);
      doc.text(`+${list.length - shown} más`, x + cellWidth - 1.5, y + 4, { align: "right" });
    }
  }

  doc.addPage("a4", "portrait");
  await feedPages(doc, project, feedItems(project, allPosts, monthKey(year, month)));
  await detailPages(doc, dated, `${monthName} ${year} · Detalle`, project.name);

  doc.save(fileName(project, `Calendario ${monthName} ${year}`));
}
