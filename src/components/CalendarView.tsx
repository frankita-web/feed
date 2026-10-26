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
import { Field, Modal, buttonClass, darkButtonClass, inputClass } from "./Modal";
import { PostDialog, statusColor } from "./PostDialog";
import { Swirl } from "./Typo";

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
    <div className="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => shift(-1)} className={buttonClass} aria-label="Mes anterior">
            ‹
          </button>
          <h2 className="min-w-52 text-center text-[clamp(32px,4.5vw,52px)] leading-none">
            <Swirl text={MONTHS[month]} />
            <span className="ml-2 align-top font-mono text-xs">{year} •</span>
          </h2>
          <button onClick={() => shift(1)} className={buttonClass} aria-label="Mes siguiente">
            ›
          </button>
        </div>
        <Legend project={project} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        {/* Escritorio: calendario como el de Canva */}
        <div className="hidden grid-cols-7 gap-2 md:grid">
          {Array.from({ length: leadingBlanks(year, month) }, (_, i) => (
            <div key={`blank-${i}`} className="min-h-36 rounded-xl border border-dashed border-ink/15" />
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
                className={`group relative flex min-h-36 cursor-pointer flex-col rounded-xl border p-2.5 backdrop-blur-[2px] transition hover:bg-white/75 ${
                  dragOver === key
                    ? "border-dashed border-ink bg-white/80"
                    : isToday
                      ? "border-ink bg-white/70"
                      : "border-white/60 bg-white/45"
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.12em] uppercase">
                  <span className={isToday ? "text-ink" : "text-graphite"}>
                    {WEEKDAYS[(leadingBlanks(year, month) + i) % 7]} {i + 1}
                    {isToday && " • hoy"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      add(key);
                    }}
                    className="h-5 w-5 rounded-full bg-ink text-xs leading-none text-white opacity-0 transition group-hover:opacity-100"
                    aria-label={`Agregar publicación el ${i + 1}`}
                  >
                    +
                  </button>
                </div>
                <div className="mt-2 space-y-2.5">
                  {byDay(key).map((post) => (
                    <PostChip key={post.id} post={post} project={project} onClick={() => edit(post)} />
                  ))}
                </div>
                {note(key) && (
                  <p className="mt-auto pt-2 text-center font-mono text-[9.5px] leading-tight tracking-wider text-graphite uppercase">
                    • {note(key)}
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
                className={`flex gap-3 rounded-xl border p-3 ${
                  key === today ? "border-ink bg-white/70" : "border-white/60 bg-white/45"
                }`}
              >
                <span className="w-16 shrink-0 font-mono text-[11px] tracking-[0.12em] whitespace-nowrap text-graphite uppercase">
                  {weekdayOf(key)} {Number(key.slice(8))}
                </span>
                <div className="flex-1 space-y-2.5">
                  {byDay(key).map((post) => (
                    <PostChip key={post.id} post={post} project={project} onClick={() => edit(post)} />
                  ))}
                  {note(key) && (
                    <p className="font-mono text-[10px] tracking-wider text-graphite uppercase">
                      • {note(key)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          <button
            onClick={() => add(today.startsWith(monthKey(year, month)) ? today : days[0])}
            className={`${darkButtonClass} w-full py-2.5`}
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
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL local
          <img src={url} alt="" className="mt-0.5 h-6 w-5 shrink-0 border-2 border-white object-cover shadow-sm" />
        ) : (
          <span
            className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: statusColor(post.status, project) }}
          />
        )}
        <span className="font-mono text-[12px] leading-tight font-bold uppercase">
          {post.title || "Sin título"}
        </span>
      </span>
      <span className="mt-1 block pl-3 font-mono text-[10px] tracking-wide text-graphite uppercase">
        [ {post.format} ]
      </span>
    </button>
  );
}

function Legend({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] tracking-[0.1em] uppercase">
      {STATUSES.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: statusColor(s, project) }} />
          {STATUS_LABEL[s]}
        </span>
      ))}
      <span className="hidden text-graphite lg:inline">· arrastra para mover de día</span>
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
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-left transition hover:bg-white"
            >
              <span className="flex items-center gap-2 font-mono text-sm font-bold uppercase">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: statusColor(post.status, project) }}
                />
                {post.title || "Sin título"}
              </span>
              <span className="font-mono text-[10px] text-graphite uppercase">[ {post.format} ]</span>
            </button>
          ))}
          <button
            onClick={() => {
              commit();
              onAdd();
            }}
            className="w-full rounded-xl border border-dashed border-black/25 px-4 py-3 text-[13px] transition hover:bg-white/60"
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
          <button onClick={close} className={darkButtonClass}>
            Listo
          </button>
        </div>
      </div>
    </Modal>
  );
}
