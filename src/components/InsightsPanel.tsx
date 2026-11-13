"use client";

import { useRef, useState } from "react";
import type { InsightsRequest, InsightsResult } from "@/app/api/estadisticas/route";
import { MONTHS, monthKey } from "@/lib/dates";
import { INSIGHT_FIELDS, change, formatNumber } from "@/lib/insights";
import type { Report } from "@/lib/report";
import { saveProject } from "@/lib/store";
import { notify } from "@/lib/toast";
import type { MonthInsights, Project } from "@/lib/types";
import { buttonClass } from "./Modal";

/** Achica la captura para mandarla a la IA sin pasarse de tamaño, pero que se lean los números. */
async function shrink(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82).split(",")[1];
}

const prevKey = (year: number, month: number) => {
  const d = new Date(year, month - 1, 1);
  return monthKey(d.getFullYear(), d.getMonth());
};

/** Estadísticas de Instagram del mes, leídas de capturas que sube Franca. */
export function InsightsPanel({
  project,
  report,
  year,
  month,
}: {
  project: Project;
  report: Report;
  year: number;
  month: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const key = monthKey(year, month);
  const data = project.insights?.[key];
  const before = project.insights?.[prevKey(year, month)];

  async function upload(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/")).slice(0, 10);
    if (!images.length) return notify("Elige capturas (fotos de pantalla).", "error");
    setBusy(true);
    notify(`Leyendo ${images.length} ${images.length === 1 ? "captura" : "capturas"}…`, "loading", "insights");
    try {
      const request: InsightsRequest = {
        project: { name: project.name, instagram: project.instagram },
        month: `${MONTHS[month]} ${year}`,
        images: await Promise.all(images.map(shrink)),
        previous: data,
        lastMonth: before,
        calendar: `${report.feed} posts en el feed (meta ${report.goal}), ${report.published} publicados, ${report.stories} stories.`,
      };
      const response = await fetch("/api/estadisticas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const result = (await response.json()) as Partial<InsightsResult> & { error?: string };
      if (!response.ok || result.error) throw new Error(result.error ?? "No pude leer las capturas.");
      // Lo nuevo manda, pero un número que ya estaba no se pierde si esta captura no lo trae.
      const merged: MonthInsights = { ...data, updatedAt: Date.now() };
      for (const [field] of INSIGHT_FIELDS) {
        const value = result[field];
        if (typeof value === "number") merged[field] = value;
      }
      if (result.topPosts?.length) merged.topPosts = result.topPosts.slice(0, 3);
      if (result.summary) merged.summary = result.summary;
      if (result.tips?.length) merged.tips = result.tips;
      saveProject({ ...project, insights: { ...project.insights, [key]: merged } });
      notify("Listo: estadísticas del mes guardadas.", "ok", "insights");
    } catch (error) {
      notify((error as Error).message, "error", "insights");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function clear() {
    if (!confirm(`¿Borrar las estadísticas de ${MONTHS[month]}? Puedes volver a subir las capturas.`)) return;
    const insights = { ...project.insights };
    delete insights[key];
    saveProject({ ...project, insights });
  }

  const numbers = INSIGHT_FIELDS.filter(([field]) => data?.[field] != null);

  return (
    <section
      className="silver mt-6 rounded-[24px] p-6"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (!busy) upload([...e.dataTransfer.files]);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-medium">Estadísticas de Instagram</h3>
        <div className="flex gap-2">
          {data && (
            <button onClick={clear} disabled={busy} className={buttonClass}>
              Borrar
            </button>
          )}
          <button onClick={() => input.current?.click()} disabled={busy} className={buttonClass}>
            {busy ? "Leyendo…" : data ? "📸 Agregar capturas" : "📸 Subir capturas"}
          </button>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => upload([...(e.target.files ?? [])])}
        />
      </div>

      {!data ? (
        <p className="mt-3 text-[13px] text-graphite">
          En Instagram entra a <b>Panel profesional → Estadísticas</b>, elige el mes y saca capturas
          de lo que veas (resumen, alcance, interacciones, seguidores). Súbelas aquí o arrástralas, y
          la página lee los números y arma el análisis.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          {numbers.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {numbers.map(([field, label]) => {
                const diff = change(data[field], before?.[field]);
                return (
                  <div key={field} className="rounded-2xl bg-white/60 p-4">
                    <p className="text-2xl leading-none font-light tracking-[-0.04em]">
                      {formatNumber(data[field]!)}
                    </p>
                    <p className="mt-1.5 text-[12px] text-graphite">{label}</p>
                    {diff && (
                      <p
                        className={`mt-1 text-[11px] font-medium ${diff.startsWith("-") ? "text-red-700" : "text-emerald-700"}`}
                      >
                        {diff} vs mes anterior
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {data.summary && <p className="text-[14px] leading-relaxed">{data.summary}</p>}
          {!!data.topPosts?.length && (
            <div>
              <p className="mb-2 text-[13px] font-medium">Lo que mejor funcionó</p>
              <ul className="space-y-1 text-[13px]">
                {data.topPosts.map((p) => (
                  <li key={p.description}>
                    • {p.description} <span className="text-graphite">· {p.result}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!data.tips?.length && (
            <div>
              <p className="mb-2 text-[13px] font-medium">Ideas para el próximo mes</p>
              <ul className="space-y-1 text-[13px]">
                {data.tips.map((t) => (
                  <li key={t}>• {t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
