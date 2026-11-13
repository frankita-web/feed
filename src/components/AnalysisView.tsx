"use client";

import { useState } from "react";
import { MONTHS, parseKey, todayKey } from "@/lib/dates";
import { reportPdf } from "@/lib/pdf";
import { monthReport } from "@/lib/report";
import type { Post, Project } from "@/lib/types";
import { InsightsPanel } from "./InsightsPanel";
import { buttonClass } from "./Modal";
import { PdfButton } from "./PdfButton";

/** Análisis y reporte del mes: lo planificado y publicado contra las metas del cliente. */
export function AnalysisView({ project, posts }: { project: Project; posts: Post[] }) {
  const [month, setMonth] = useState(() => {
    const { year, month } = parseKey(todayKey());
    return new Date(year, month, 1);
  });
  const shift = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const y = month.getFullYear();
  const m = month.getMonth();
  const report = monthReport(project, posts, y, m);
  const peak = Math.max(report.goal, ...report.history.map((h) => h.count), 1);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-16 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => shift(-1)} className={buttonClass} aria-label="Mes anterior">
            ‹
          </button>
          <h2 className="min-w-52 text-center text-[clamp(28px,4vw,44px)] leading-none">
            <span className="font-semibold tracking-[-0.05em] capitalize">{MONTHS[m]}</span>
            <span className="ml-2 tracking-[-0.05em] text-graphite/60">{y}</span>
          </h2>
          <button onClick={() => shift(1)} className={buttonClass} aria-label="Mes siguiente">
            ›
          </button>
        </div>
        <PdfButton make={() => reportPdf(project, report, y, m)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Posts del mes" value={`${report.feed}/${report.goal}`} />
        <Stat label="Publicados" value={report.published} />
        <Stat label="Stories" value={report.stories} />
      </div>

      <InsightsPanel project={project} report={report} year={y} month={m} />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {report.pillars.length > 0 && (
          <Card title="Por categoría">
            {report.pillars.map((p) => (
              <Bar
                key={p.name}
                label={p.name}
                value={`${p.count}/${p.target}`}
                share={p.target ? p.count / p.target : 0}
              />
            ))}
          </Card>
        )}

        <Card title="Por formato">
          {report.formats.length ? (
            report.formats.map((f) => (
              <Bar
                key={f.name}
                label={f.name}
                value={String(f.count)}
                share={report.total ? f.count / report.total : 0}
              />
            ))
          ) : (
            <p className="text-[13px] text-graphite">Este mes todavía no tiene publicaciones.</p>
          )}
        </Card>

        <Card title="Últimos 6 meses">
          <div className="flex h-36 items-end gap-3">
            {report.history.map((h, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[12px] font-medium">{h.count}</span>
                <div
                  className="w-full rounded-t-md bg-ink"
                  style={{ height: `${(h.count / peak) * 100}%`, minHeight: 2 }}
                />
                <span className="text-[11px] text-graphite capitalize">{h.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Para mejorar">
          {report.advice.length ? (
            <ul className="space-y-2 text-[14px]">
              {report.advice.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px]">Todo al día: el mes cumple sus metas.</p>
          )}
        </Card>
      </div>

      <p className="mt-6 text-[12px] text-graphite">
        Los posts y categorías salen de tu calendario. Los números de Instagram salen de las
        capturas que subas cada mes.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="silver rounded-[20px] p-5">
      <p className="text-4xl leading-none font-light tracking-[-0.05em]">{value}</p>
      <p className="mt-2 text-[12px] text-graphite">{label}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="silver rounded-[24px] p-6">
      <h3 className="mb-4 text-[15px] font-medium">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Bar({ label, value, share }: { label: string; value: string; share: number }) {
  return (
    <div>
      <div className="flex justify-between text-[13px]">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-ink"
          style={{ width: `${Math.min(100, share * 100)}%` }}
        />
      </div>
    </div>
  );
}
