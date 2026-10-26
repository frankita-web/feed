"use client";

import { useState } from "react";
import {
  MONTHS,
  WEEKDAYS,
  dateKey,
  daysInMonth,
  leadingBlanks,
  monthKey,
  todayKey,
  weekdayOf,
} from "@/lib/dates";
import { useImageUrl } from "@/lib/images";
import { newPost, saveNote, savePost } from "@/lib/store";
import { STATUSES, STATUS_LABEL, type Post, type Project } from "@/lib/types";
import { MonthAnalysis } from "./MonthAnalysis";
import { Field, Modal, inputClass } from "./Modal";
import { PostDialog, statusColor } from "./PostDialog";

type Editing = { post: Post; isNew: boolean };

export function CalendarView({
  project,
  posts,
  notes,
}: {
  project: Project;
  posts: Post[];
  notes: Record<string, string>;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const { year, month } = cursor;
  const today = todayKey();
  const monthPosts = posts.filter((p) => p.date?.startsWith(monthKey(year, month)));
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) =>
    dateKey(year, month, i + 1),
  );
  const byDay = (key: string) =>
    monthPosts.filter((p) => p.date === key).sort((a, b) => a.createdAt - b.createdAt);
  const note = (key: string) => notes[`${project.slug}:${key}`];

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const add = (date: string) => setEditing({ post: newPost(project.slug, { date }), isNew: true });
  const edit = (post: Post) => setEditing({ post, isNew: false });

  const drop = (date: string, id: string) => {
    const post = posts.find((p) => p.id === id);
    if (post && post.date !== date) savePost({ ...post, date });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            className="h-9 w-9 rounded-full bg-white/70 text-lg hover:bg-white"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <h2
            className="min-w-56 text-center text-4xl font-black tracking-tight sm:text-5xl"
            style={{ color: project.accent }}
          >
            {MONTHS[month]}
            <span className="ml-2 text-lg font-bold text-neutral-900/40">{year}</span>
          </h2>
          <button
            onClick={() => shift(1)}
            className="h-9 w-9 rounded-full bg-white/70 text-lg hover:bg-white"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>
        <Legend project={project} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_260px]">
        {/* Escritorio: calendario como el de Canva */}
        <div className="hidden grid-cols-7 gap-2.5 md:grid">
          {Array.from({ length: leadingBlanks(year, month) }, (_, i) => (
            <div key={`blank-${i}`} className="min-h-32 rounded-2xl bg-white/40" />
          ))}
          {days.map((key, i) => {
            const isToday = key === today;
            return (
              <div
                key={key}
                onClick={() => setOpenDay(key)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(key);
                }}
                onDragLeave={() => setDragOver((d) => (d === key ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  drop(key, e.dataTransfer.getData("text/plain"));
                }}
                className="group relative flex min-h-32 cursor-pointer flex-col rounded-2xl bg-[#f8f8f8] p-2.5 transition hover:bg-white"
                style={{
                  outline:
                    dragOver === key
                      ? `3px dashed ${project.accent}`
                      : isToday
                        ? `3px solid ${project.accent}`
                        : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold tracking-widest text-neutral-400">
                    {WEEKDAYS[(leadingBlanks(year, month) + i) % 7]} {i + 1}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      add(key);
                    }}
                    className="h-6 w-6 rounded-full text-lg leading-none opacity-0 transition group-hover:opacity-100 hover:bg-neutral-100"
                    style={{ color: project.accent }}
                    aria-label={`Agregar publicación el ${i + 1}`}
                  >
                    +
                  </button>
                </div>
                <div className="mt-1 space-y-2">
                  {byDay(key).map((post) => (
                    <PostChip key={post.id} post={post} project={project} onClick={() => edit(post)} />
                  ))}
                </div>
                {note(key) && (
                  <p className="mt-auto pt-2 text-center text-[10px] font-semibold tracking-wider text-neutral-400">
                    {note(key)}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Celular: agenda */}
        <div className="space-y-2 md:hidden">
          {days
            .filter((key) => byDay(key).length || note(key) || key === today)
            .map((key) => (
              <div
                key={key}
                onClick={() => setOpenDay(key)}
                className="flex gap-3 rounded-2xl bg-[#f8f8f8] p-3"
                style={key === today ? { outline: `2px solid ${project.accent}` } : undefined}
              >
                <span className="w-16 shrink-0 text-sm font-semibold tracking-widest whitespace-nowrap text-neutral-400">
                  {weekdayOf(key)} {Number(key.slice(8))}
                </span>
                <div className="flex-1 space-y-2">
                  {byDay(key).map((post) => (
                    <PostChip key={post.id} post={post} project={project} onClick={() => edit(post)} />
                  ))}
                  {note(key) && <p className="text-xs text-neutral-400">{note(key)}</p>}
                </div>
              </div>
            ))}
          <button
            onClick={() => add(today.startsWith(monthKey(year, month)) ? today : days[0])}
            className="w-full rounded-2xl border-2 border-dashed border-white/80 p-3 text-sm font-semibold"
            style={{ color: project.accent }}
          >
            + Nueva publicación
          </button>
        </div>

        <MonthAnalysis project={project} posts={monthPosts} />
      </div>

      {openDay && (
        <DayDialog
          date={openDay}
          project={project}
          posts={byDay(openDay)}
          note={note(openDay) ?? ""}
          onEdit={(post) => {
            setOpenDay(null);
            edit(post);
          }}
          onAdd={() => {
            setOpenDay(null);
            add(openDay);
          }}
          onClose={() => setOpenDay(null)}
        />
      )}
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

function PostChip({
  post,
  project,
  onClick,
}: {
  post: Post;
  project: Project;
  onClick: () => void;
}) {
  const url = useImageUrl(post.image);
  const color = statusColor(post.status, project);

  return (
    <button
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", post.id)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="block w-full cursor-grab text-left active:cursor-grabbing"
    >
      <span className="flex items-start gap-1.5">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL local
          <img src={url} alt="" className="mt-0.5 h-6 w-5 shrink-0 rounded object-cover" />
        )}
        <span className="text-sm leading-tight font-semibold" style={{ color }}>
          {post.status === "publicado" && "✓ "}
          {post.title || "Sin título"}
        </span>
      </span>
      <span
        className="mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap italic"
        style={{ borderColor: project.accent, color: project.accent }}
      >
        • {post.format}
      </span>
    </button>
  );
}

function Legend({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap gap-3 rounded-full bg-white/70 px-4 py-1.5 text-xs font-semibold">
      {STATUSES.map((s) => (
        <span key={s} className="flex items-center gap-1.5" style={{ color: statusColor(s, project) }}>
          <span className="h-2 w-2 rounded-full" style={{ background: statusColor(s, project) }} />
          {STATUS_LABEL[s]}
        </span>
      ))}
      <span className="hidden text-neutral-500 lg:inline">· Arrastra para mover de día</span>
    </div>
  );
}

function DayDialog({
  date,
  project,
  posts,
  note,
  onEdit,
  onAdd,
  onClose,
}: {
  date: string;
  project: Project;
  posts: Post[];
  note: string;
  onEdit: (post: Post) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(note);
  const day = Number(date.slice(8));
  const month = MONTHS[Number(date.slice(5, 7)) - 1];

  const commit = () => {
    if (text !== note) saveNote(project.slug, date, text);
  };
  const close = () => {
    commit();
    onClose();
  };

  return (
    <Modal title={`${weekdayOf(date)} ${day} de ${month}`} onClose={close}>
      <div className="space-y-5">
        <div className="space-y-2">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() => {
                commit();
                onEdit(post);
              }}
              className="flex w-full items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 text-left hover:bg-neutral-100"
            >
              <span className="font-semibold" style={{ color: statusColor(post.status, project) }}>
                {post.title || "Sin título"}
              </span>
              <span className="text-xs text-neutral-500 italic">{post.format}</span>
            </button>
          ))}
          <button
            onClick={() => {
              commit();
              onAdd();
            }}
            className="w-full rounded-xl border-2 border-dashed border-neutral-200 px-4 py-3 text-sm font-semibold hover:border-neutral-400"
            style={{ color: project.accent }}
          >
            + Agregar publicación
          </button>
        </div>
        <Field label="Nota del día (efeméride, recordatorio)">
          <input
            className={inputClass}
            value={text}
            placeholder="Ej. Día internacional de la pasta"
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <div className="flex justify-end">
          <button
            onClick={close}
            className="rounded-full px-5 py-2 text-sm font-semibold text-white"
            style={{ background: project.accent }}
          >
            Listo
          </button>
        </div>
      </div>
    </Modal>
  );
}
