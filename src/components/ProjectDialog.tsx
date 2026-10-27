"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveProject, slugify, useStore } from "@/lib/store";
import { STATUSES, STATUS_LABEL, paletteOf, type Project } from "@/lib/types";
import { storeImage } from "@/lib/images";
import { Logo } from "./Logo";
import { Field, Modal, buttonClass, darkButtonClass, inputClass } from "./Modal";
import { statusColor } from "./Status";

const EMPTY: Project = {
  slug: "",
  name: "",
  instagram: "",
  bg: "#ece4f5",
  accent: "#9b7bc4",
  monthlyGoal: 12,
  pillars: [],
  palette: ["#9b7bc4", "#ece4f5"],
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
  const [draft, setDraft] = useState(() =>
    project ? { ...project, palette: paletteOf(project) } : EMPTY,
  );
  const set = (fields: Partial<Project>) => setDraft((d) => ({ ...d, ...fields }));
  const palette = draft.palette ?? [];
  const setPalette = (next: string[], accent = draft.accent) =>
    set({ palette: next, accent: next.includes(accent) ? accent : (next[0] ?? accent) });

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
          {taken && <p className="mt-1 text-xs text-[#b3261e]">Ya existe un proyecto con ese nombre.</p>}
        </Field>
        <Field label="Instagram">
          <input
            className={inputClass}
            value={draft.instagram}
            placeholder="usuario (sin @)"
            onChange={(e) => set({ instagram: e.target.value })}
          />
        </Field>
        <Field label="Logo">
          <div className="flex items-center gap-4">
            <Logo project={draft} className="h-14 w-14 shrink-0" />
            <label className={`${buttonClass} cursor-pointer`}>
              Subir logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) set({ logo: await storeImage(file) });
                }}
              />
            </label>
            {draft.logo && (
              <button
                type="button"
                onClick={() => set({ logo: undefined })}
                className="text-[13px] text-graphite hover:text-ink"
              >
                Quitar
              </button>
            )}
          </div>
        </Field>

        <Field label="Paleta de la marca">
          <div className="flex flex-wrap items-end gap-3">
            {palette.map((color, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <label
                  className={`relative block h-11 w-11 cursor-pointer rounded-full ring-1 ring-black/10 ${
                    color === draft.accent ? "ring-2 ring-ink ring-offset-2" : ""
                  }`}
                  style={{ background: color }}
                  title="Cambiar color"
                >
                  <input
                    type="color"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    value={color}
                    onChange={(e) =>
                      setPalette(
                        palette.map((c, j) => (j === i ? e.target.value : c)),
                        color === draft.accent ? e.target.value : draft.accent,
                      )
                    }
                  />
                </label>
                <span className="flex gap-1 text-[10px] text-graphite">
                  <button
                    type="button"
                    onClick={() => set({ accent: color })}
                    className={color === draft.accent ? "font-semibold text-ink" : "hover:text-ink"}
                  >
                    {color === draft.accent ? "principal" : "usar"}
                  </button>
                  {palette.length > 1 && (
                    <button
                      type="button"
                      aria-label="Quitar color"
                      onClick={() => setPalette(palette.filter((_, j) => j !== i))}
                      className="hover:text-ink"
                    >
                      ×
                    </button>
                  )}
                </span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPalette([...palette, "#cccccc"])}
              className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-ink/30 text-lg text-graphite hover:border-ink hover:text-ink"
              aria-label="Agregar color"
            >
              +
            </button>
          </div>
        </Field>

        <Field label="Colores de estado">
          <div className="space-y-2">
            {STATUSES.map((status) => {
              const current = statusColor(status, draft);
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-20 text-[13px]">{STATUS_LABEL[status]}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {palette.map((color, i) => (
                      <button
                        key={`${color}-${i}`}
                        type="button"
                        aria-label={`${STATUS_LABEL[status]}: ${color}`}
                        onClick={() =>
                          set({ statusColors: { ...draft.statusColors, [status]: color } })
                        }
                        className={`h-6 w-6 rounded-full ring-1 ring-black/15 ${
                          current === color ? "ring-2 ring-ink ring-offset-2" : ""
                        }`}
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Field>

        <div className="w-40">
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
                  className="px-2 text-xl text-graphite hover:text-ink"
                  onClick={() => set({ pillars: draft.pillars.filter((_, j) => j !== i) })}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-[13px] underline"
              onClick={() => set({ pillars: [...draft.pillars, { name: "", target: 1 }] })}
            >
              + agregar categoría
            </button>
          </div>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-1.5 text-[13px] text-graphite">
            Cancelar
          </button>
          <button
            type="submit"
            className={darkButtonClass}
          >
            {project ? "Guardar" : "Crear proyecto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
