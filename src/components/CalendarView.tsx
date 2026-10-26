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
import { Bow } from "./Bow";
import { MonthAnalysis } from "./MonthAnalysis";
import { Field, Modal, inputClass } from "./Modal";
import { PostDialog, statusColor } from "./PostDialog";

type Editing = { post: Post; isNew: boolean };

const navButton =
  "h-9 w-9 rounded-full border border-white/70 bg-white/70 font-display text-2xl leading-none text-ink/70 transition hover:bg-white";

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_270px]">
        <section
          className="relative rounded-[40px] p-4 pt-6 shadow-[0_24px_50px_-30px_rgb(150_70_95/0.55)] sm:p-6"
          style={{ background: project.bg }}
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <button onClick={() => shift(-1)} className={navButton} aria-label="Mes anterior">
                ‹
              </button>
              <h2
                className="min-w-48 text-center font-display text-5xl leading-none font-medium italic sm:text-6xl"
                style={{ color: project.accent }}
              >
                {MONTHS[month]}
                <span className="ml-2 align-middle font-sans text-xs tracking-[0.3em] text-ink/50 not-italic">
                  {year}
                </span>
              </h2>
              <button onClick={() => shift(1)} className={navButton} aria-label="Mes siguiente">
                ›
              </button>
            </div>
            <Legend project={project} />
          </div>

          {/* Escritorio: calendario como el de Canva */}
          <div className="hidden grid-cols-7 gap-2.5 md:grid">
            {Array.from({ length: leadingBlanks(year, month) }, (_, i) => (
              <div key={`blank-${i}`} className="min-h-36 rounded-[22px] bg-white/35" />
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
                  className="group relative flex min-h-36 cursor-pointer flex-col rounded-[22px] bg-[#fffdfb] p-3 shadow-[0_6px_14px_-10px_rgb(150_70_95/0.45)] transition hover:-translate-y-0.5"
                  style={{
                    outline:
                      dragOver === key
                        ? `2px dashed ${project.accent}`
                        : isToday
                          ? `2px solid ${project.accent}`
                          : undefined,
                    outlineOffset: 2,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-[10px] tracking-[0.2em] text-mauve uppercase">
                        {WEEKDAYS[(leadingBlanks(year, month) + i) % 7]}
                      </span>
                      <span className="font-display text-xl leading-none text-ink/70 italic">
                        {i + 1}
                      </span>
                    </span>
                    {isToday ? (
                      <Bow color={project.bg} className="h-4 w-6" />
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          add(key);
                        }}
                        className="h-6 w-6 rounded-full text-lg leading-none opacity-0 transition group-hover:opacity-100 hover:bg-blush"
                        style={{ color: project.accent }}
                        aria-label={`Agregar publicación el ${i + 1}`}
                      >
                        +
                      </button>
                    )}
                  </div>
                  <div className="mt-2 space-y-2.5">
                    {byDay(key).map((post) => (
                      <PostChip
                        key={post.id}
                        post={post}
                        project={project}
                        onClick={() => edit(post)}
                      />
                    ))}
                  </div>
                  {note(key) && (
                    <p className="mt-auto pt-2 text-center font-display text-[13px] leading-tight text-mauve italic">
                      {note(key)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Celular: agenda */}
          <div className="space-y-2.5 md:hidden">
            {days
              .filter((key) => byDay(key).length || note(key) || key === today)
              .map((key) => (
                <div
                  key={key}
                  onClick={() => setOpenDay(key)}
                  className="flex gap-3 rounded-[22px] bg-[#fffdfb] p-3.5"
                  style={key === today ? { outline: `2px solid ${project.accent}` } : undefined}
                >
                  <span className="flex w-14 shrink-0 flex-col items-center">
                    <span className="text-[10px] tracking-[0.2em] text-mauve uppercase">
                      {weekdayOf(key)}
                    </span>
                    <span className="font-display text-2xl leading-none text-ink/70 italic">
                      {Number(key.slice(8))}
                    </span>
                  </span>
                  <div className="flex-1 space-y-2.5">
                    {byDay(key).map((post) => (
                      <PostChip
                        key={post.id}
                        post={post}
                        project={project}
                        onClick={() => edit(post)}
                      />
                    ))}
                    {note(key) && (
                      <p className="font-display text-sm text-mauve italic">{note(key)}</p>
                    )}
                  </div>
                </div>
              ))}
            <button
              onClick={() => add(today.startsWith(monthKey(year, month)) ? today : days[0])}
              className="w-full rounded-[22px] border-2 border-dashed border-white/80 p-3 font-display text-xl italic"
              style={{ color: project.accent }}
            >
              + nueva publicación
            </button>
          </div>
        </section>

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
          <img src={url} alt="" className="mt-0.5 h-6 w-5 shrink-0 rounded-md object-cover" />
        )}
        <span className="text-[13px] leading-snug font-medium" style={{ color }}>
          {post.status === "publicado" && "✓ "}
          {post.title || "Sin título"}
        </span>
      </span>
      <span
        className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10.5px] whitespace-nowrap"
        style={{ background: `${project.accent}14`, color: project.accent }}
      >
        ♡ {post.format}
      </span>
    </button>
  );
}

function Legend({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-full bg-white/70 px-4 py-1.5 text-xs">
      {STATUSES.map((s) => (
        <span key={s} className="flex items-center gap-1" style={{ color: statusColor(s, project) }}>
          <span aria-hidden="true">♥</span>
          {STATUS_LABEL[s].toLowerCase()}
        </span>
      ))}
      <span className="hidden font-display text-sm text-mauve italic lg:inline">
        · arrastra para mover de día
      </span>
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
    <Modal title={`${weekdayOf(date).toLowerCase()} ${day} de ${month}`} onClose={close}>
      <div className="space-y-5">
        <div className="space-y-2">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() => {
                commit();
                onEdit(post);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-petal bg-white px-4 py-3 text-left transition hover:border-rose"
            >
              <span className="font-medium" style={{ color: statusColor(post.status, project) }}>
                {post.title || "Sin título"}
              </span>
              <span className="text-xs text-mauve">♡ {post.format}</span>
            </button>
          ))}
          <button
            onClick={() => {
              commit();
              onAdd();
            }}
            className="w-full rounded-2xl border-2 border-dashed border-petal px-4 py-3 font-display text-xl italic transition hover:border-rose"
            style={{ color: project.accent }}
          >
            + agregar publicación
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
            className="rounded-full px-6 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgb(120_40_70/0.6)]"
            style={{ background: project.accent }}
          >
            listo ♡
          </button>
        </div>
      </div>
    </Modal>
  );
}
