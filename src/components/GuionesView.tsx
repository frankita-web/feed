"use client";

import { useState } from "react";
import { shortDate, todayKey } from "@/lib/dates";
import { deleteScript, newScene, newScript, saveScript } from "@/lib/store";
import { SCRIPT_STATUSES, type Post, type Project, type Scene, type Script } from "@/lib/types";
import { Field, buttonClass, darkButtonClass, inputClass } from "./Modal";
import { ScriptChat } from "./ScriptChat";

const isVideo = (p: Post) =>
  p.format.startsWith("Reel") || p.format === "Tbc" || p.format === "Stories";

const STATUS_LABEL: Record<Script["status"], string> = {
  idea: "Idea",
  borrador: "Borrador",
  listo: "Listo para grabar",
};

/** Guiones de los videos: lista, editor por tomas y chat con IA para armarlos. */
export function GuionesView({
  project,
  posts,
  scripts,
}: {
  project: Project;
  posts: Post[];
  scripts: Script[];
}) {
  const mine = scripts
    .filter((s) => s.project === project.slug)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const [selectedId, setSelectedId] = useState<string | null>(mine[0]?.id ?? null);
  const selected = mine.find((s) => s.id === selectedId) ?? mine[0] ?? null;

  const today = todayKey();
  const withScript = new Set(mine.map((s) => s.postId));
  const pendingVideos = posts
    .filter(
      (p) =>
        isVideo(p) &&
        p.status !== "publicado" &&
        (!p.date || p.date >= today) &&
        !withScript.has(p.id),
    )
    .sort((a, b) => ((a.date ?? "9") < (b.date ?? "9") ? -1 : 1));

  const create = (post?: Post) => {
    const script = newScript(project.slug, post ? { postId: post.id, title: post.title } : {});
    saveScript(script);
    setSelectedId(script.id);
  };

  return (
    <div className="grid gap-5 px-4 pt-6 pb-10 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[220px_minmax(0,1fr)_380px]">
      {/* Lista */}
      <aside className="space-y-5">
        <button onClick={() => create()} className={`${darkButtonClass} w-full py-2`}>
          + Nuevo guion
        </button>
        {mine.length > 0 && (
          <nav className="space-y-0.5">
            {mine.map((s) => {
              const post = posts.find((p) => p.id === s.postId);
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`block w-full rounded-xl px-3 py-2 text-left transition ${
                    selected?.id === s.id ? "bg-white shadow-sm" : "hover:bg-white/50"
                  }`}
                >
                  <span className="block truncate text-[14px] font-medium">
                    {s.title || "Sin título"}
                  </span>
                  <span className="text-[11px] text-graphite">
                    {STATUS_LABEL[s.status]}
                    {post?.date && ` · ${shortDate(post.date)}`}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
        {pendingVideos.length > 0 && (
          <div>
            <p className="mb-1.5 px-1 text-[11px] font-medium tracking-[0.08em] text-graphite uppercase">
              Videos sin guion
            </p>
            <ul className="space-y-0.5">
              {pendingVideos.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => create(p)}
                    className="flex w-full items-baseline gap-2 rounded-xl px-3 py-1.5 text-left text-[13px] text-ink/80 hover:bg-white/50 hover:text-ink"
                  >
                    <span className="min-w-0 flex-1 truncate">{p.title || "Sin título"}</span>
                    <span className="shrink-0 text-[11px] text-graphite">
                      {p.date ? shortDate(p.date) : "s/f"} +
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {selected ? (
        <>
          <ScriptEditor key={selected.id} script={selected} posts={posts} />
          <div className="lg:col-span-2 2xl:col-span-1">
            <ScriptChat
              key={selected.id}
              script={selected}
              project={project}
              post={posts.find((p) => p.id === selected.postId)}
            />
          </div>
        </>
      ) : (
        <div className="silver flex flex-col items-center justify-center gap-3 rounded-[24px] p-12 text-center lg:col-span-1 2xl:col-span-2">
          <p className="text-xl font-semibold tracking-[-0.03em]">Todavía no hay guiones</p>
          <p className="max-w-sm text-[13px] text-graphite">
            Crea uno nuevo o elige un video del calendario. Puedes escribirlo tú o pedirle a la IA
            que te ayude a armarlo.
          </p>
          <button onClick={() => create(pendingVideos[0])} className={darkButtonClass}>
            {pendingVideos[0] ? `Guion para "${pendingVideos[0].title}"` : "+ Nuevo guion"}
          </button>
        </div>
      )}
    </div>
  );
}

function ScriptEditor({ script, posts }: { script: Script; posts: Post[] }) {
  const set = (fields: Partial<Script>) => saveScript({ ...script, ...fields });
  const setScene = (id: string, fields: Partial<Scene>) =>
    set({ scenes: script.scenes.map((s) => (s.id === id ? { ...s, ...fields } : s)) });
  const move = (i: number, d: number) => {
    const next = [...script.scenes];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set({ scenes: next });
  };
  const total = script.scenes.reduce((n, s) => n + (parseFloat(s.seconds) || 0), 0);
  const videoPosts = posts
    .filter((p) => isVideo(p) || p.id === script.postId)
    .sort((a, b) => ((a.date ?? "0") < (b.date ?? "0") ? 1 : -1));

  return (
    <section className="silver min-w-0 rounded-[24px] p-6">
      <div className="flex flex-wrap items-start gap-3">
        <input
          className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tracking-[-0.03em] outline-none placeholder:text-graphite/50"
          value={script.title}
          placeholder="Título del video"
          onChange={(e) => set({ title: e.target.value })}
        />
        <div className="flex rounded-full border border-black/10 bg-white/60 p-0.5">
          {SCRIPT_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => set({ status: s })}
              className={`rounded-full px-3 py-1 text-[12px] transition ${
                script.status === s ? "bg-ink font-medium text-white" : "hover:bg-white"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
        <Field label="Video del calendario">
          <select
            className={inputClass}
            value={script.postId ?? ""}
            onChange={(e) => set({ postId: e.target.value || null })}
          >
            <option value="">Sin vincular</option>
            {videoPosts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.date ? `${shortDate(p.date)} · ` : ""}
                {p.title || "Sin título"} ({p.format})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Duración">
          <input
            className={inputClass}
            value={script.duration}
            placeholder={total ? `${total} s` : "Ej. 20 s"}
            onChange={(e) => set({ duration: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Gancho (primeros 3 segundos)">
          <textarea
            rows={2}
            className={inputClass}
            value={script.hook}
            placeholder="Lo primero que se ve y se escucha"
            onChange={(e) => set({ hook: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[11px] font-medium tracking-[0.08em] text-graphite uppercase">
            Tomas
          </span>
          {total > 0 && <span className="text-[12px] text-graphite">{total} s en total</span>}
        </div>
        <ol className="space-y-3">
          {script.scenes.map((scene, i) => (
            <li key={scene.id} className="rounded-2xl border border-black/10 bg-white/70 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
                  {i + 1}
                </span>
                <input
                  className="min-w-0 flex-1 bg-transparent text-[14px] font-medium outline-none placeholder:text-graphite/60"
                  value={scene.shot}
                  placeholder="Plano (ej. detalle cenital de la pizza)"
                  onChange={(e) => setScene(scene.id, { shot: e.target.value })}
                />
                <input
                  className="w-12 rounded-lg border border-black/10 bg-white px-1.5 py-0.5 text-right text-[12px] outline-none"
                  value={scene.seconds}
                  placeholder="s"
                  aria-label="Segundos"
                  onChange={(e) => setScene(scene.id, { seconds: e.target.value })}
                />
                <div className="flex text-graphite">
                  <button
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="px-1 hover:text-ink disabled:opacity-30"
                    aria-label="Subir toma"
                  >
                    ↑
                  </button>
                  <button
                    disabled={i === script.scenes.length - 1}
                    onClick={() => move(i, 1)}
                    className="px-1 hover:text-ink disabled:opacity-30"
                    aria-label="Bajar toma"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => set({ scenes: script.scenes.filter((s) => s.id !== scene.id) })}
                    className="px-1 hover:text-ink"
                    aria-label="Quitar toma"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["action", "Qué pasa"],
                    ["onScreen", "Texto en pantalla"],
                    ["audio", "Voz / audio"],
                  ] as const
                ).map(([key, label]) => (
                  <textarea
                    key={key}
                    rows={2}
                    className={`${inputClass} text-[13px]`}
                    value={scene[key]}
                    placeholder={label}
                    aria-label={label}
                    onChange={(e) => setScene(scene.id, { [key]: e.target.value })}
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
        <button
          onClick={() => set({ scenes: [...script.scenes, newScene()] })}
          className={`${buttonClass} mt-3 w-full border-dashed`}
        >
          + Agregar toma
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Cierre / llamado a la acción">
          <textarea
            rows={3}
            className={inputClass}
            value={script.closing}
            onChange={(e) => set({ closing: e.target.value })}
          />
        </Field>
        <Field label="Notas de producción">
          <textarea
            rows={3}
            className={inputClass}
            value={script.notes}
            placeholder="Props, locación, quién sale…"
            onChange={(e) => set({ notes: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => confirm("¿Borrar este guion?") && deleteScript(script.id)}
          className="text-[13px] text-graphite hover:text-ink hover:underline"
        >
          Borrar guion
        </button>
      </div>
    </section>
  );
}
