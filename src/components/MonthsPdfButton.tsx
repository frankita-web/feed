"use client";

import { useState } from "react";
import { MONTHS } from "@/lib/dates";
import { calendarPdf } from "@/lib/pdf";
import { notify } from "@/lib/toast";
import type { Post, Project } from "@/lib/types";
import { buttonClass, darkButtonClass } from "./Modal";

type MonthRef = { year: number; month: number };
const keyOf = (m: MonthRef) => `${m.year}-${m.month}`;

/** "Descargar PDF" del calendario: se eligen uno o varios meses para el mismo PDF. */
export function MonthsPdfButton({
  project,
  posts,
  year,
  month,
}: {
  project: Project;
  posts: Post[];
  year: number;
  month: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // El mes anterior, el que se está viendo y los tres siguientes.
  const options: MonthRef[] = [-1, 0, 1, 2, 3].map((delta) => {
    const d = new Date(year, month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [picked, setPicked] = useState<Set<string>>(() => new Set([keyOf({ year, month })]));
  const count = (m: MonthRef) =>
    posts.filter((p) => p.date?.startsWith(`${m.year}-${String(m.month + 1).padStart(2, "0")}`))
      .length;

  const download = async () => {
    const months = options.filter((m) => picked.has(keyOf(m)));
    if (!months.length) return;
    setOpen(false);
    setBusy(true);
    notify("Armando el PDF…", "loading", "pdf");
    try {
      await calendarPdf(project, posts, months);
      notify("PDF descargado.", "ok", "pdf");
    } catch (error) {
      console.error(error);
      notify("No se pudo armar el PDF. Inténtalo de nuevo.", "error", "pdf");
    }
    setBusy(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setPicked(new Set([keyOf({ year, month })]));
          setOpen((v) => !v);
        }}
        disabled={busy}
        className={buttonClass}
      >
        {busy ? "Preparando PDF…" : "Descargar PDF"}
      </button>
      {open && (
        <div className="absolute top-full right-0 z-40 mt-2 w-64 rounded-2xl border border-white/70 bg-white/80 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl">
          <p className="mb-2 text-[12px] text-graphite">¿Qué meses van en el PDF?</p>
          <div className="space-y-1">
            {options.map((m) => {
              const key = keyOf(m);
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[14px] hover:bg-black/5"
                >
                  <input
                    type="checkbox"
                    className="accent-ink"
                    checked={picked.has(key)}
                    onChange={() =>
                      setPicked((set) => {
                        const next = new Set(set);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                  />
                  <span className="flex-1 capitalize">
                    {MONTHS[m.month]} {m.year}
                  </span>
                  <span className="text-[11px] text-graphite">{count(m)} posts</span>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="px-2 text-[13px] text-graphite">
              Cancelar
            </button>
            <button onClick={download} disabled={!picked.size} className={darkButtonClass}>
              Descargar ({picked.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
