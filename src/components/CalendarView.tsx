"use client";

import { useState, type DragEvent } from "react";
import {
  MONTHS,
  WEEKDAYS,
  addDays,
  dateKey,
  daysInMonth,
  leadingBlanks,
  monthKey,
  mondayOf,
  parseKey,
  shortDate,
  todayKey,
  weekdayOf,
} from "@/lib/dates";
import { useImageUrl } from "@/lib/images";
import { newPost, saveNote, savePost } from "@/lib/store";
import { STATUSES, STATUS_LABEL, type Post, type Project } from "@/lib/types";
import { MonthAnalysis } from "./MonthAnalysis";
import { Field, Modal, buttonClass, darkButtonClass, inputClass } from "./Modal";
import { PostDialog, statusColor } from "./PostDialog";

type Editing = { post: Post; isNew: boolean };
type View = "mes" | "semana";

export function CalendarView({
  project,
  posts,
  notes,
}: {
  project: Project;
  posts: Post[];
  notes: Record<string, string>;
}) {
  const [view, setView] = useState<View>("mes");
  // Fecha de referencia: define el mes visible y la semana visible.
  const [anchor, setAnchor] = useState(todayKey);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const { year, month } = parseKey(anchor);
  const today = todayKey();
  const monthPosts = posts.filter((p) => p.date?.startsWith(monthKey(year, month)));
  const weekStart = mondayOf(anchor);
  const days =
    view === "mes"
      ? Array.from({ length: daysInMonth(year, month) }, (_, i) => dateKey(year, month, i + 1))
      : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byDay = (key: string) =>
    posts.filter((p) => p.date === key).sort((a, b) => a.createdAt - b.createdAt);
  const note = (key: string) => notes[`${project.slug}:${key}`];

  const shift = (delta: number) =>
    setAnchor((a) => {
      if (view === "semana") return addDays(a, 7 * delta);
      const { year, month } = parseKey(a);
      const d = new Date(year, month + delta, 1);
      return dateKey(d.getFullYear(), d.getMonth(), 1);
    });

  const changeView = (v: View) => {
    if (v === "semana" && today.startsWith(monthKey(year, month))) setAnchor(today);
    setView(v);
  };

  const add = (date: string) => setEditing({ post: newPost(project.slug, { date }), isNew: true });
  const edit = (post: Post) => setEditing({ post, isNew: false });

  const drop = (date: string, id: string) => {
    const post = posts.find((p) => p.id === id);
    if (post && post.date !== date) savePost({ ...post, date });
  };

  // Cada día recibe publicaciones arrastradas desde otro día.
  const dropTarget = (key: string) => ({
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setDragOver(key);
    },
    onDragLeave: () => setDragOver((d) => (d === key ? null : d)),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      drop(key, e.dataTransfer.getData("text/plain"));
    },
  });
  const cellTone = (key: string) =>
    dragOver === key
      ? "border-dashed border-ink bg-white/80"
      : key === today
        ? "border-ink bg-white/70"
        : "border-white/60 bg-white/45";

  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => shift(-1)}
            className={buttonClass}
            aria-label={view === "mes" ? "Mes anterior" : "Semana anterior"}
          >
            ‹
          </button>
          <h2 className="min-w-52 text-center text-[clamp(32px,4.5vw,52px)] leading-none">
            {view === "mes" ? (
              <>
                <span className="font-semibold tracking-[-0.05em] capitalize">{MONTHS[month]}</span>
                <span className="ml-2 tracking-[-0.05em] text-graphite/60">{year}</span>
              </>
            ) : (
              <>
                <span className="font-semibold tracking-[-0.05em]">
                  {shortDate(weekStart)} – {shortDate(weekEnd)}
                </span>
                <span className="ml-2 tracking-[-0.05em] text-graphite/60">
                  {parseKey(weekEnd).year}
                </span>
              </>
            )}
          </h2>
          <button
            onClick={() => shift(1)}
            className={buttonClass}
            aria-label={view === "mes" ? "Mes siguiente" : "Semana siguiente"}
          >
            ›
          </button>
          <nav className="flex rounded-full border border-black/10 bg-white/50 p-1">
            {(["mes", "semana"] as const).map((v) => (
              <button
                key={v}
                onClick={() => changeView(v)}
                className={`rounded-full px-3.5 py-1 text-[13px] capitalize transition ${
                  view === v ? "bg-ink font-medium text-white" : "hover:bg-white/70"
                }`}
              >
                {v}
              </button>
            ))}
          </nav>
        </div>
        <Legend project={project} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        {view === "mes" ? (
          /* Escritorio: mes como el calendario de Canva */
          <div className="hidden grid-cols-7 gap-2 md:grid">
            {Array.from({ length: leadingBlanks(year, month) }, (_, i) => (
              <div
                key={`blank-${i}`}
                className="min-h-36 rounded-xl border border-dashed border-ink/15"
              />
            ))}
            {days.map((key, i) => (
              <div
                key={key}
                onClick={() => setOpenDay(key)}
                {...dropTarget(key)}
                className={`group relative flex min-h-36 cursor-pointer flex-col rounded-xl border p-2.5 backdrop-blur-[2px] transition hover:bg-white/75 ${cellTone(key)}`}
              >
                <DayHeader
                  dayKey={key}
                  label={`${WEEKDAYS[(leadingBlanks(year, month) + i) % 7]} ${i + 1}`}
                  today={today}
                  onAdd={() => add(key)}
                />
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
                  <p className="mt-auto pt-2 text-center text-[10px] leading-tight text-graphite">
                    {note(key)}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Escritorio: semana con fichas más grandes */
          <div className="hidden grid-cols-7 gap-2 md:grid">
            {days.map((key) => (
              <div
                key={key}
                {...dropTarget(key)}
                className={`group flex min-h-[30rem] flex-col rounded-xl border p-2.5 backdrop-blur-[2px] transition ${cellTone(key)}`}
              >
                <DayHeader
                  dayKey={key}
                  label={`${weekdayOf(key)} ${parseKey(key).day}`}
                  today={today}
                  onAdd={() => add(key)}
                />
                {note(key) && (
                  <p className="mt-1 text-[10px] leading-tight text-graphite">{note(key)}</p>
                )}
                <div className="mt-3 space-y-3">
                  {byDay(key).map((post) => (
                    <WeekCard
                      key={post.id}
                      post={post}
                      project={project}
                      onClick={() => edit(post)}
                    />
                  ))}
                </div>
                <button
                  onClick={() => add(key)}
                  className="mt-auto rounded-lg border border-dashed border-ink/20 py-2 text-[12px] text-graphite opacity-0 transition group-hover:opacity-100 hover:border-ink hover:text-ink"
                >
                  + Agregar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Celular: agenda */}
        <div className="space-y-2 md:hidden">
          {days
            .filter((key) => view === "semana" || byDay(key).length || note(key) || key === today)
            .map((key) => (
              <div
                key={key}
                onClick={() => setOpenDay(key)}
                className={`flex gap-3 rounded-xl border p-3 ${
                  key === today ? "border-ink bg-white/70" : "border-white/60 bg-white/45"
                }`}
              >
                <span className="w-16 shrink-0 text-[11px] font-medium tracking-[0.06em] whitespace-nowrap text-graphite uppercase">
                  {weekdayOf(key)} {parseKey(key).day}
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
                  {note(key) && <p className="text-[11px] text-graphite">{note(key)}</p>}
                </div>
              </div>
            ))}
          <button
            onClick={() => add(days.includes(today) ? today : days[0])}
            className={`${darkButtonClass} w-full py-2.5`}
          >
            + Nueva publicación
          </button>
        </div>

        <MonthAnalysis project={project} posts={monthPosts} onEdit={edit} />
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

function DayHeader({
  dayKey,
  label,
  today,
  onAdd,
}: {
  dayKey: string;
  label: string;
  today: string;
  onAdd: () => void;
}) {
  const isToday = dayKey === today;
  return (
    <div className="flex items-center justify-between text-[11px] font-medium tracking-[0.06em] uppercase">
      <span className={isToday ? "text-ink" : "text-graphite"}>
        {label}
        {isToday && " · hoy"}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="h-5 w-5 rounded-full bg-ink text-xs leading-none text-white opacity-0 transition group-hover:opacity-100"
        aria-label={`Agregar publicación el ${label}`}
      >
        +
      </button>
    </div>
  );
}

/** Ficha resumida para la vista semanal: portada, título, formato, hora y copy. */
function WeekCard({
  post,
  project,
  onClick,
}: {
  post: Post;
  project: Project;
  onClick: () => void;
}) {
  const url = useImageUrl(post.image);
  const count = (post.image ? 1 : 0) + (post.slides?.length ?? 0);

  return (
    <button
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", post.id)}
      onClick={onClick}
      className="block w-full cursor-grab overflow-hidden rounded-lg bg-white/90 text-left shadow-sm transition hover:shadow-md active:cursor-grabbing"
    >
      <div className="relative aspect-[3/4] bg-[#dedede]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL local
          <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-[11px] text-graphite">
            Sin portada
          </span>
        )}
        {count > 1 && (
          <span className="absolute top-1.5 right-1.5 rounded-full bg-ink/70 px-1.5 text-[10px] text-white">
            1/{count}
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="flex items-start gap-1.5 text-[12.5px] leading-tight font-semibold">
          <span
            className="mt-1 h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: statusColor(post.status, project) }}
          />
          {post.title || "Sin título"}
        </p>
        <p className="mt-0.5 text-[11px] text-graphite">
          {post.format}
          {post.time && ` · ${post.time}`}
          {post.files?.length
            ? ` · ${post.files.length} archivo${post.files.length > 1 ? "s" : ""}`
            : ""}
        </p>
        {post.caption && (
          <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-ink/70">{post.caption}</p>
        )}
      </div>
    </button>
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
          <img
            src={url}
            alt=""
            className="mt-0.5 h-6 w-5 shrink-0 border-2 border-white object-cover shadow-sm"
          />
        ) : (
          <span
            className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: statusColor(post.status, project) }}
          />
        )}
        <span className="text-[12.5px] leading-tight font-semibold tracking-[-0.01em]">
          {post.title || "Sin título"}
        </span>
      </span>
      <span className="mt-0.5 block pl-3 text-[11px] text-graphite">{post.format}</span>
    </button>
  );
}

function Legend({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[12px]">
      {STATUSES.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span
            className="h-[7px] w-[7px] rounded-full"
            style={{ background: statusColor(s, project) }}
          />
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
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: statusColor(post.status, project) }}
                />
                {post.title || "Sin título"}
              </span>
              <span className="text-xs text-graphite">{post.format}</span>
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
