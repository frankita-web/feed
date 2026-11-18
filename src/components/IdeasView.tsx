"use client";

import { useState } from "react";
import { shortDate, todayKey } from "@/lib/dates";
import { parsePlan, planPreview } from "@/lib/ideaPlan";
import { newIdea, newShoot, saveIdea, saveShoot } from "@/lib/store";
import type { Idea, Project, Shoot } from "@/lib/types";
import { IdeaSheet } from "./IdeaSheet";
import { buttonClass, darkButtonClass, inputClass } from "./Modal";
import { ShootPlan } from "./ShootPlan";

const NONE = "__sin__";

/** Ideas para próximos shoots, en columnas por shoot. Se arrastran de una a otra. */
export function IdeasView({
  project,
  ideas,
  shoots,
}: {
  project: Project;
  ideas: Idea[];
  shoots: Shoot[];
}) {
  const [text, setText] = useState("");
  const [over, setOver] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const planned = shoots.find((s) => s.id === planId);
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = ideas.find((i) => i.id === openId);

  const today = todayKey();
  const mine = ideas.filter((i) => i.project === project.slug && (showDone || !i.done));
  // Columnas: sin asignar + shoots que vienen (o sin fecha) + shoots pasados que tengan ideas.
  const columns = shoots
    .filter(
      (s) =>
        s.project === project.slug &&
        (!s.date || s.date >= today || mine.some((i) => i.shootId === s.id)),
    )
    .sort((a, b) => ((a.date ?? "9") < (b.date ?? "9") ? -1 : 1));

  const add = () => {
    if (!text.trim()) return;
    saveIdea(newIdea(project.slug, { title: text.trim() }));
    setText("");
  };

  const planShoot = () => saveShoot(newShoot(project.slug, { title: "Próximo shoot", date: null }));

  const move = (id: string, column: string) => {
    const idea = ideas.find((i) => i.id === id);
    if (idea) saveIdea({ ...idea, shootId: column === NONE ? null : column });
  };

  const column = (key: string, title: string, subtitle: string, list: Idea[], shoot?: Shoot) => (
    <div
      key={key}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(key);
      }}
      onDragLeave={() => setOver((o) => (o === key ? null : o))}
      onDrop={(e) => {
        e.preventDefault();
        setOver(null);
        move(e.dataTransfer.getData("text/plain"), key);
      }}
      className={`flex w-72 shrink-0 flex-col rounded-[22px] p-3 transition ${
        over === key ? "bg-white/80 ring-2 ring-ink" : "bg-white/40"
      }`}
    >
      {shoot ? (
        <div className="mb-3 px-1">
          <div className="flex items-baseline justify-between gap-2">
            <input
              className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold tracking-[-0.01em] outline-none"
              value={shoot.title}
              placeholder="Nombre del shoot"
              onChange={(e) => saveShoot({ ...shoot, title: e.target.value })}
            />
            <span className="text-[12px] text-graphite">{list.length}</span>
          </div>
          <input
            type="date"
            className="bg-transparent text-[12px] text-graphite outline-none"
            value={shoot.date ?? ""}
            onChange={(e) => saveShoot({ ...shoot, date: e.target.value || null })}
            aria-label="Día del shoot"
          />
          <button
            onClick={() => setPlanId(shoot.id)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-[12px] font-medium text-white"
          >
            📋 Plan del shoot
            {!!(shoot.timeline?.length || shoot.slides?.length) && (
              <span className="text-white/60">
                · {shoot.timeline?.length ?? 0} bloques · {shoot.slides?.length ?? 0} láminas
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="mb-3 px-1">
          <p className="flex items-baseline justify-between gap-2 text-[14px] font-semibold tracking-[-0.01em]">
            <span className="truncate">{title}</span>
            <span className="text-[12px] font-normal text-graphite">{list.length}</span>
          </p>
          <p className="text-[12px] text-graphite">{subtitle}</p>
        </div>
      )}
      <div className="flex min-h-24 flex-col gap-2">
        {list.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} onOpen={() => setOpenId(idea.id)} />
        ))}
        {!list.length && (
          <p className="rounded-xl border border-dashed border-black/15 p-4 text-center text-[12px] text-graphite">
            Arrastra ideas aquí
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="px-4 pt-6 pb-16 sm:px-8">
      <form
        className="mb-6 flex max-w-3xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          className={`${inputClass} py-2.5`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Anota una idea… (ej. ASMR del corte de la pizza, POV mesero)"
        />
        <button type="submit" disabled={!text.trim()} className={`${darkButtonClass} shrink-0`}>
          Agregar
        </button>
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-[13px]">
        <button onClick={planShoot} className={buttonClass}>
          + Planear shoot
        </button>
        <label className="flex cursor-pointer items-center gap-2 text-graphite">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="accent-ink"
          />
          Mostrar ideas ya grabadas
        </label>
      </div>

      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
        {column(
          NONE,
          "Sin asignar",
          "Ideas sueltas",
          mine.filter((i) => !i.shootId || !shoots.some((s) => s.id === i.shootId)),
        )}
        {columns.map((s) =>
          column(
            s.id,
            s.title || "Shoot",
            [s.date ? shortDate(s.date) : "Sin fecha", s.crew].filter(Boolean).join(" · "),
            mine.filter((i) => i.shootId === s.id),
            s,
          ),
        )}
      </div>
      {opened && (
        <IdeaSheet idea={opened} project={project} shoots={shoots} onClose={() => setOpenId(null)} />
      )}
      {planned && (
        <ShootPlan project={project} shoot={planned} ideas={ideas} onClose={() => setPlanId(null)} />
      )}
    </div>
  );
}

function IdeaCard({ idea, onOpen }: { idea: Idea; onOpen: () => void }) {
  const plan = parsePlan(idea.notes);
  const preview = planPreview(plan);

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", idea.id)}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      role="button"
      tabIndex={0}
      className={`cursor-pointer rounded-xl border border-black/10 bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing ${
        idea.done ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            saveIdea({ ...idea, done: !idea.done });
          }}
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
            idea.done ? "border-ink bg-ink text-white" : "border-black/30"
          }`}
          title={idea.done ? "Marcar como pendiente" : "Marcar como grabada"}
        >
          {idea.done && "✓"}
        </button>
        <p
          className={`min-w-0 flex-1 text-[13px] leading-snug font-semibold ${
            idea.done ? "line-through" : ""
          }`}
        >
          {idea.title || "Idea sin título"}
        </p>
      </div>
      {preview.text && (
        <p className="mt-1.5 line-clamp-3 pl-6 text-[12px] leading-snug text-graphite">
          {preview.text}
        </p>
      )}
      {preview.overlay && (
        <p className="mt-2 pl-6">
          <span className="inline-block rounded-md bg-ink px-2 py-1 text-[10px] leading-tight font-extrabold tracking-tight text-white uppercase">
            {preview.overlay}
          </span>
        </p>
      )}
      {(idea.pillar || plan.format || idea.link) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6 text-[11px] text-graphite">
          {idea.pillar && (
            <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-ink">{idea.pillar}</span>
          )}
          {plan.format && <span>{plan.format}</span>}
          {idea.link && <span>↗ referencia</span>}
        </div>
      )}
    </div>
  );
}
