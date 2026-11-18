"use client";

import { useState } from "react";
import { shortDate, todayKey } from "@/lib/dates";
import { newIdea, newShoot, saveIdea, saveShoot } from "@/lib/store";
import type { Idea, Project, Shoot } from "@/lib/types";
import { IdeaDeck } from "./IdeaDeck";
import { IdeaSheet } from "./IdeaSheet";
import { buttonClass, darkButtonClass, inputClass } from "./Modal";
import { ShootPlan } from "./ShootPlan";

const NONE = "__sin__";
const ALL = "__todas__";

/**
 * Ideas para próximos shoots, como presentación: una lámina horizontal por idea, que se edita ahí
 * mismo. Arriba se elige qué ver (todas, las sueltas o las de un shoot) y se planea cada shoot.
 */
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
  const [showDone, setShowDone] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const planned = shoots.find((s) => s.id === planId);
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = ideas.find((i) => i.id === openId);
  const [group, setGroup] = useState(ALL);
  // Lámina que se está viendo: por id, para no perderla si cambia el orden; si la idea ya no está
  // (se borró o se marcó grabada), se queda en la misma posición.
  const [slide, setSlide] = useState<{ id: string | null; index: number }>({ id: null, index: 0 });

  const today = todayKey();
  const mine = ideas.filter((i) => i.project === project.slug && (showDone || !i.done));
  // Shoots que vienen (o sin fecha) y los pasados que todavía tengan ideas.
  const projectShoots = shoots
    .filter(
      (s) =>
        s.project === project.slug &&
        (!s.date || s.date >= today || mine.some((i) => i.shootId === s.id)),
    )
    .sort((a, b) => ((a.date ?? "9") < (b.date ?? "9") ? -1 : 1));

  const unassigned = mine.filter((i) => !i.shootId || !shoots.some((s) => s.id === i.shootId));
  // Sueltas primero y después cada shoot por fecha.
  const groups = [
    { key: NONE, title: "Sin asignar", list: unassigned, shoot: undefined as Shoot | undefined },
    ...projectShoots.map((s) => ({
      key: s.id,
      title: [s.title || "Shoot", s.date && shortDate(s.date)].filter(Boolean).join(" · "),
      list: mine.filter((i) => i.shootId === s.id),
      shoot: s as Shoot | undefined,
    })),
  ];
  const activeGroup = groups.some((g) => g.key === group) ? group : ALL;
  const activeShoot = groups.find((g) => g.key === activeGroup)?.shoot;
  const deck = groups
    .filter((g) => activeGroup === ALL || g.key === activeGroup)
    .flatMap((g) => g.list);
  const found = deck.findIndex((i) => i.id === slide.id);
  const current = found >= 0 ? found : Math.max(0, Math.min(slide.index, deck.length - 1));

  const add = () => {
    if (!text.trim()) return;
    // Si se está viendo un shoot, la idea nueva queda en ese shoot.
    const idea = newIdea(project.slug, { title: text.trim(), shootId: activeShoot?.id ?? null });
    saveIdea(idea);
    setText("");
    setSlide({ id: idea.id, index: 0 });
  };

  const planShoot = () => {
    const shoot = newShoot(project.slug, { title: "Próximo shoot", date: null });
    saveShoot(shoot);
    setGroup(shoot.id);
    setPlanId(shoot.id);
  };

  const pick = (key: string) => {
    setGroup(key);
    setSlide({ id: null, index: 0 });
  };

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

      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[13px]">
        {[{ key: ALL, title: "Todas", list: mine }, ...groups].map((g) => (
          <button
            key={g.key}
            onClick={() => pick(g.key)}
            className={`rounded-full border px-3 py-1 transition ${
              activeGroup === g.key
                ? "border-ink bg-ink text-white"
                : "border-black/10 bg-white/70 text-ink hover:bg-white"
            }`}
          >
            {g.title} <span className="opacity-60">{g.list.length}</span>
          </button>
        ))}
        <button onClick={planShoot} className={buttonClass}>
          + Planear shoot
        </button>
        {activeShoot && (
          <button
            onClick={() => setPlanId(activeShoot.id)}
            className="rounded-full bg-ink px-4 py-1.5 font-medium text-white"
          >
            📋 Plan del shoot
            {!!(activeShoot.timeline?.length || activeShoot.slides?.length) && (
              <span className="text-white/60">
                {" "}
                · {activeShoot.timeline?.length ?? 0} bloques · {activeShoot.slides?.length ?? 0}{" "}
                láminas
              </span>
            )}
          </button>
        )}
        <label className="ml-1 flex cursor-pointer items-center gap-2 text-graphite">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="accent-ink"
          />
          Mostrar ideas ya grabadas
        </label>
      </div>

      <IdeaDeck
        project={project}
        ideas={deck}
        shoots={shoots}
        shootOptions={projectShoots}
        index={current}
        onGo={(index) => setSlide({ id: deck[index]?.id ?? null, index })}
        onKeep={(id) => setSlide((s) => ({ id, index: s.index }))}
        onEdit={setOpenId}
      />

      {opened && (
        <IdeaSheet
          idea={opened}
          project={project}
          shoots={shoots}
          onClose={() => setOpenId(null)}
        />
      )}
      {planned && (
        <ShootPlan
          project={project}
          shoot={planned}
          ideas={ideas}
          onClose={() => setPlanId(null)}
        />
      )}
    </div>
  );
}
