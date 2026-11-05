"use client";

import { useState } from "react";
import { MONTHS, dateKey, monthKey, shortDate, todayKey } from "@/lib/dates";
import { drinksIn, isDiageoPost, isDrinkPost } from "@/lib/drinks";
import { newPost, saveProject } from "@/lib/store";
import type { Drink, Post, Project } from "@/lib/types";
import { buttonClass, inputClass } from "./Modal";
import { PostDialog } from "./PostDialog";
import { StatusDot } from "./Status";

type Editing = { post: Post; isNew: boolean };

/** Sección Drinks: el post Diageo de cada mes y la carta con lo que ya se subió. */
export function DrinksView({ project, posts }: { project: Project; posts: Post[] }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [editing, setEditing] = useState<Editing | null>(null);
  const [onlyDiageo, setOnlyDiageo] = useState(false);

  const drinks = project.drinks ?? [];
  const plan = project.drinkPlan ?? {};
  const today = todayKey();
  const thisMonth = today.slice(0, 7);
  const drinkPosts = posts.filter((p) => p.date && isDrinkPost(p, project));
  // Antes del primer post cargado no hay información: no cuenta como "no se subió".
  const firstMonth = posts
    .map((p) => p.date)
    .filter((d): d is string => !!d)
    .sort()[0]
    ?.slice(0, 7);

  const months = Array.from({ length: 12 }, (_, m) => {
    const key = monthKey(year, m);
    const list = drinkPosts
      .filter((p) => p.date!.startsWith(key))
      .sort((a, b) => (a.date! < b.date! ? -1 : 1));
    const diageo = list.filter((p) => isDiageoPost(p, project));
    const state = diageo.some((p) => p.status === "publicado")
      ? "cumplido"
      : diageo.length
        ? "programado"
        : !firstMonth || key < firstMonth
          ? "sinDatos"
          : key < thisMonth
            ? "falto"
          : key === thisMonth
            ? "falta"
            : "pendiente";
    return { m, key, list, state, plan: plan[key] } as const;
  });
  const due = months.filter((x) => x.key <= thisMonth && x.state !== "sinDatos");
  const done = due.filter((x) => x.state === "cumplido").length;

  const setPlan = (key: string, drink: string) => {
    const next = { ...plan };
    if (drink) next[key] = { ...next[key], drink };
    else delete next[key];
    saveProject({ ...project, drinkPlan: next });
  };

  const toggleDiageo = (drink: Drink) =>
    saveProject({
      ...project,
      drinks: drinks.map((d) => (d.name === drink.name ? { ...d, diageo: !d.diageo } : d)),
    });

  const schedule = (key: string, drink?: string) =>
    setEditing({
      isNew: true,
      post: newPost(project.slug, {
        title: drink ? `Drink ${drink}` : "Drink Diageo",
        pillar: project.pillars.some((p) => p.name === "Drink") ? "Drink" : null,
        format: "Reel vertical",
        date:
          key === thisMonth
            ? today
            : dateKey(Number(key.slice(0, 4)), Number(key.slice(5)) - 1, 15),
      }),
    });

  const sections = [...new Set(drinks.map((d) => d.section))];
  const lastPosted = (drink: Drink) =>
    drinkPosts
      .filter((p) => drinksIn(p, [drink]).length)
      .map((p) => p.date!)
      .sort();

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-16 sm:px-8">
      {/* Regla */}
      <div className="silver flex flex-wrap items-center justify-between gap-6 rounded-[24px] p-6">
        <div className="max-w-xl">
          <p className="text-[11px] font-medium tracking-[0.08em] text-graphite uppercase">
            Diageo · non negociable
          </p>
          <p className="mt-2 text-[17px] leading-snug font-medium tracking-[-0.01em]">
            1 vez al mes, un post al feed (foto o video) con un drink que tenga alcohol de Diageo,
            etiquetándolos.
          </p>
        </div>
        <p className="text-5xl leading-none font-light tracking-[-0.05em]">
          {done}
          <span className="text-graphite/50">/{due.length}</span>
          <span className="ml-2 align-middle text-[12px] tracking-normal text-graphite">
            meses cumplidos
          </span>
        </p>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Mes a mes */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">Mes a mes</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setYear((y) => y - 1)}
                className={buttonClass}
                aria-label="Año anterior"
              >
                ‹
              </button>
              <span className="text-[15px] font-medium">{year}</span>
              <button
                onClick={() => setYear((y) => y + 1)}
                className={buttonClass}
                aria-label="Año siguiente"
              >
                ›
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/45">
            {months.map(({ m, key, list, state, plan: p }) => (
              <div
                key={key}
                className={`grid grid-cols-[88px_minmax(0,1fr)] gap-3 border-b border-black/5 px-4 py-3 last:border-0 sm:grid-cols-[96px_170px_minmax(0,1fr)_auto] sm:items-center ${
                  key === thisMonth ? "bg-white/70" : ""
                }`}
              >
                <span className="text-[13px] font-semibold capitalize">{MONTHS[m]}</span>

                <div className="min-w-0">
                  <select
                    value={p?.drink ?? ""}
                    onChange={(e) => setPlan(key, e.target.value)}
                    className={`${inputClass} py-1.5 text-[13px]`}
                    aria-label={`Drink planeado para ${MONTHS[m]}`}
                  >
                    <option value="">Sin plan</option>
                    {drinks
                      .filter((d) => d.diageo || d.name === p?.drink)
                      .map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                  {p?.note && <p className="mt-0.5 text-[11px] text-graphite">{p.note}</p>}
                </div>

                <div className="col-span-2 flex min-w-0 flex-wrap gap-1.5 sm:col-span-1">
                  {list.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => setEditing({ post, isNew: false })}
                      className="flex max-w-full items-center gap-1.5 rounded-full border border-black/10 bg-white/80 px-2.5 py-1 text-[12px] hover:bg-white"
                    >
                      <StatusDot status={post.status} project={project} className="h-1.5 w-1.5" />
                      <span className="truncate">{post.title || "Sin título"}</span>
                      <span className="whitespace-nowrap text-graphite">
                        {shortDate(post.date!)}
                      </span>
                    </button>
                  ))}
                  {!list.length && state !== "pendiente" && state !== "sinDatos" && (
                    <span className="py-1 text-[12px] text-graphite">Sin drinks</span>
                  )}
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
                  <MonthState state={state} project={project} />
                  {(state === "falta" || state === "pendiente") && (
                    <button
                      onClick={() => schedule(key, p?.drink)}
                      className="text-[12px] whitespace-nowrap text-graphite underline hover:text-ink"
                    >
                      + Programar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Carta */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">Carta</h2>
            <label className={`${buttonClass} flex cursor-pointer items-center gap-2`}>
              <input
                type="checkbox"
                checked={onlyDiageo}
                onChange={(e) => setOnlyDiageo(e.target.checked)}
                className="accent-ink"
              />
              Solo Diageo
            </label>
          </div>
          <div className="space-y-5">
            {sections.map((section) => {
              const list = drinks.filter((d) => d.section === section && (!onlyDiageo || d.diageo));
              if (!list.length) return null;
              return (
                <div key={section}>
                  <p className="mb-1.5 text-[11px] font-medium tracking-[0.08em] text-graphite uppercase">
                    {section}
                  </p>
                  <ul className="overflow-hidden rounded-2xl border border-white/60 bg-white/45">
                    {list.map((drink) => {
                      const dates = lastPosted(drink);
                      return (
                        <li
                          key={drink.name}
                          className="flex items-start gap-3 border-b border-black/5 px-4 py-3 last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-semibold tracking-[-0.01em]">
                              {drink.name}
                            </p>
                            <p className="text-[12px] leading-snug text-graphite">
                              {drink.description}
                            </p>
                            <p className="mt-1 text-[11px] text-graphite">
                              {dates.length
                                ? `Subido ${dates.length}× · último ${shortDate(dates.at(-1)!)}`
                                : "Nunca subido"}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleDiageo(drink)}
                            title="Marcar o quitar Diageo"
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                              drink.diageo
                                ? "bg-ink text-white"
                                : "border border-dashed border-black/20 text-graphite hover:text-ink"
                            }`}
                          >
                            {drink.diageo ? "Diageo" : "+ Diageo"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {editing && (
        <PostDialog
          key={editing.post.id}
          project={project}
          post={editing.post}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function MonthState({ state, project }: { state: string; project: Project }) {
  const map: Record<string, [string, string]> = {
    cumplido: ["Cumplido", "bg-ink text-white"],
    programado: ["Programado", "border border-ink/40"],
    falta: ["Falta este mes", "border border-ink/40 font-medium"],
    falto: ["No se subió", "border border-dashed border-black/25 text-graphite"],
    pendiente: ["", ""],
    sinDatos: ["Sin datos", "text-graphite/70"],
  };
  const [label, cls] = map[state];
  if (!label) return null;
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] whitespace-nowrap ${cls}`}
    >
      {state === "falta" && (
        <StatusDot status="pendiente" project={project} className="h-1.5 w-1.5" />
      )}
      {label}
    </span>
  );
}
