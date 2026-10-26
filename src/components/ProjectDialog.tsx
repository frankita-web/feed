"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveProject, slugify, useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { Field, Modal, inputClass } from "./Modal";

const EMPTY: Project = {
  slug: "",
  name: "",
  instagram: "",
  bg: "#e9e3f7",
  accent: "#6d3fd1",
  monthlyGoal: 12,
  pillars: [],
};

export function ProjectDialog({
  project,
  onClose,
}: {
  project?: Project;
  onClose: () => void;
}) {
  const store = useStore();
  const router = useRouter();
  const [draft, setDraft] = useState(project ?? EMPTY);
  const set = (fields: Partial<Project>) => setDraft((d) => ({ ...d, ...fields }));

  const slug = project?.slug ?? slugify(draft.name);
  const taken = !project && !!store?.projects.some((p) => p.slug === slug);

  const save = () => {
    saveProject(
      {
        ...draft,
        slug,
        name: draft.name.trim(),
        instagram: draft.instagram.replace(/^@/, "").trim(),
        pillars: draft.pillars.filter((p) => p.name.trim()),
      },
      project?.slug,
    );
    onClose();
    if (!project) router.push(`/proyecto/${slug}`);
  };

  return (
    <Modal title={project ? `Ajustes de ${project.name}` : "Nuevo proyecto"} onClose={onClose}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (slug && !taken) save();
        }}
      >
        <Field label="Nombre">
          <input
            autoFocus
            required
            className={inputClass}
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
          />
          {taken && <p className="mt-1 text-xs text-red-600">Ya existe un proyecto con ese nombre.</p>}
        </Field>
        <Field label="Instagram">
          <input
            className={inputClass}
            value={draft.instagram}
            placeholder="usuario (sin @)"
            onChange={(e) => set({ instagram: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Fondo">
            <input
              type="color"
              className="h-10 w-full cursor-pointer rounded-xl"
              value={draft.bg}
              onChange={(e) => set({ bg: e.target.value })}
            />
          </Field>
          <Field label="Acento">
            <input
              type="color"
              className="h-10 w-full cursor-pointer rounded-xl"
              value={draft.accent}
              onChange={(e) => set({ accent: e.target.value })}
            />
          </Field>
          <Field label="Posts al mes">
            <input
              type="number"
              min={0}
              className={inputClass}
              value={draft.monthlyGoal}
              onChange={(e) => set({ monthlyGoal: Number(e.target.value) })}
            />
          </Field>
        </div>

        <Field label="Categorías del mes (análisis mensual)">
          <div className="space-y-2">
            {draft.pillars.map((pillar, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  className={`${inputClass} w-20`}
                  value={pillar.target}
                  aria-label="Cantidad"
                  onChange={(e) =>
                    set({
                      pillars: draft.pillars.map((p, j) =>
                        j === i ? { ...p, target: Number(e.target.value) } : p,
                      ),
                    })
                  }
                />
                <input
                  className={inputClass}
                  value={pillar.name}
                  placeholder="Ej. Pizza"
                  aria-label="Categoría"
                  onChange={(e) =>
                    set({
                      pillars: draft.pillars.map((p, j) =>
                        j === i ? { ...p, name: e.target.value } : p,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  aria-label="Quitar"
                  className="px-2 text-xl text-neutral-400 hover:text-neutral-900"
                  onClick={() => set({ pillars: draft.pillars.filter((_, j) => j !== i) })}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm font-medium"
              style={{ color: draft.accent }}
              onClick={() => set({ pillars: [...draft.pillars, { name: "", target: 1 }] })}
            >
              + Agregar categoría
            </button>
          </div>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-full px-5 py-2 text-sm font-semibold text-white"
            style={{ background: draft.accent }}
          >
            {project ? "Guardar" : "Crear proyecto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
