"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { shortDate, todayKey } from "@/lib/dates";
import {
  deleteIdea,
  newIdea,
  newScript,
  newShoot,
  saveIdea,
  saveScript,
  saveShoot,
} from "@/lib/store";
import type { Idea, Project, Shoot } from "@/lib/types";
import { buttonClass, darkButtonClass, inputClass } from "./Modal";

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
          <IdeaCard key={idea.id} idea={idea} project={project} />
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
    </div>
  );
}

function IdeaCard({ idea, project }: { idea: Idea; project: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState(!idea.title);
  const set = (fields: Partial<Idea>) => saveIdea({ ...idea, ...fields });

  const toScript = () => {
    const script = newScript(project.slug, {
      title: idea.title,
      notes: [idea.notes, idea.link && `Referencia: ${idea.link}`].filter(Boolean).join("\n"),
    });
    saveScript(script);
    router.push(`/proyecto/${project.slug}/guiones`);
  };

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", idea.id)}
      className={`cursor-grab rounded-xl border border-black/10 bg-white p-3 shadow-sm active:cursor-grabbing ${
        idea.done ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => set({ done: !idea.done })}
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
            idea.done ? "border-ink bg-ink text-white" : "border-black/30"
          }`}
          title={idea.done ? "Marcar como pendiente" : "Marcar como grabada"}
        >
          {idea.done && "✓"}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`min-w-0 flex-1 text-left text-[13px] leading-snug font-medium ${
            idea.done ? "line-through" : ""
          }`}
        >
          {idea.title || "Idea sin título"}
        </button>
      </div>
      {!open && (idea.pillar || idea.notes || idea.link) && (
        <p className="mt-1.5 truncate pl-6 text-[11px] text-graphite">
          {[idea.pillar, idea.notes, idea.link && "↗ referencia"].filter(Boolean).join(" · ")}
        </p>
      )}

      {open && (
        <div className="mt-3 space-y-2" onDragStart={(e) => e.preventDefault()} draggable>
          <input
            className={`${inputClass} py-1.5 text-[13px]`}
            value={idea.title}
            placeholder="Idea"
            onChange={(e) => set({ title: e.target.value })}
          />
          <textarea
            rows={3}
            className={`${inputClass} text-[12px]`}
            value={idea.notes}
            placeholder="Cómo sería, qué se necesita…"
            onChange={(e) => set({ notes: e.target.value })}
          />
          <div className="flex gap-1.5">
            <input
              className={`${inputClass} py-1.5 text-[12px]`}
              value={idea.link}
              placeholder="Link de referencia"
              onChange={(e) => set({ link: e.target.value })}
            />
            {idea.link && (
              <a
                href={idea.link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center rounded-xl border border-black/10 px-2 text-[12px]"
              >
                ↗
              </a>
            )}
          </div>
          {project.pillars.length > 0 && (
            <select
              className={`${inputClass} py-1.5 text-[12px]`}
              value={idea.pillar ?? ""}
              onChange={(e) => set({ pillar: e.target.value || null })}
            >
              <option value="">Sin categoría</option>
              {project.pillars.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
          )}
          <div className="flex items-center justify-between pt-1 text-[12px]">
            <button onClick={toScript} className="font-medium underline">
              Pasar a guion →
            </button>
            <span className="flex gap-3">
              <button
                onClick={() => confirm("¿Borrar esta idea?") && deleteIdea(idea.id)}
                className="text-graphite hover:text-ink"
              >
                Borrar
              </button>
              <button onClick={() => setOpen(false)} className="text-graphite hover:text-ink">
                Cerrar
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
