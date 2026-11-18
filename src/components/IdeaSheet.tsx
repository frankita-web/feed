"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { shortDate } from "@/lib/dates";
import { ideaFormat, linkLabel, parsePlan, type PlanLine, type PlanSection } from "@/lib/ideaPlan";
import { isLocal, removeImage, storeImage, useImageUrl } from "@/lib/images";
import { currentState, deleteIdea, newScript, saveIdea, saveScript } from "@/lib/store";
import { notify } from "@/lib/toast";
import { FORMATS, type Idea, type Project, type Shoot } from "@/lib/types";
import { Chips, Field, Modal, buttonClass, darkButtonClass, inputClass } from "./Modal";

/** Una idea abierta para leerla con calma: hook, tomas, audio, copy… y editarla si hace falta. */
export function IdeaSheet({
  idea,
  project,
  shoots,
  onClose,
}: {
  idea: Idea;
  project: Project;
  shoots: Shoot[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!idea.notes.trim());
  const set = (fields: Partial<Idea>) => saveIdea({ ...idea, ...fields });
  const plan = parsePlan(idea.notes);
  const { format, details } = ideaFormat(idea, plan);
  const shoot = shoots.find((s) => s.id === idea.shootId);

  const toScript = () => {
    const script = newScript(project.slug, {
      title: idea.title,
      notes: [idea.notes, idea.link && `Referencia: ${idea.link}`].filter(Boolean).join("\n"),
    });
    saveScript(script);
    router.push(`/proyecto/${project.slug}/guiones`);
  };

  return (
    <Modal title={idea.title || "Idea sin título"} onClose={onClose} size="md">
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2 text-[12px]">
        {format && <Chip>🎬 {[format, details].filter(Boolean).join(" · ")}</Chip>}
        {idea.pillar && <Chip>{idea.pillar}</Chip>}
        <Chip>
          {shoot
            ? `📅 ${shoot.title || "Shoot"}${shoot.date ? ` · ${shortDate(shoot.date)}` : ""}`
            : "Sin shoot"}
        </Chip>
        {idea.done && <Chip>✓ Ya grabada</Chip>}
        {idea.link && (
          <a
            href={idea.link}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-ink px-3 py-1 font-medium text-white"
          >
            Ver referencia ↗
          </a>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <Field label="Idea">
            <input
              className={inputClass}
              value={idea.title}
              placeholder="Idea"
              onChange={(e) => set({ title: e.target.value })}
            />
          </Field>
          <Field label="Formato">
            <Chips
              options={FORMATS}
              value={idea.format ?? format}
              onChange={(f) => set({ format: f })}
            />
          </Field>
          <Field label="Shoot">
            <select
              className={inputClass}
              value={idea.shootId ?? ""}
              onChange={(e) => set({ shootId: e.target.value || null })}
            >
              <option value="">Idea suelta (sin shoot)</option>
              {shoots
                .filter((s) => s.project === project.slug)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {[s.title || "Shoot", s.date && shortDate(s.date)].filter(Boolean).join(" · ")}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Cómo sería">
            <textarea
              rows={16}
              className={`${inputClass} text-[13px] leading-relaxed`}
              value={idea.notes}
              placeholder={
                "Reel vertical 9:16 · 15 s\n\nHOOK (0–2 s): qué pasa en el primer segundo.\nTexto: «LO QUE DICE EN PANTALLA»\n\nTOMAS\n1. …\n2. …\n\nAUDIO: …\n\nCOPY: …\n\nNECESITAMOS: …"
              }
              onChange={(e) => set({ notes: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Link de referencia">
              <input
                className={inputClass}
                value={idea.link}
                placeholder="Reel, Pinterest, TikTok…"
                onChange={(e) => set({ link: e.target.value })}
              />
            </Field>
            {project.pillars.length > 0 && (
              <Field label="Categoría">
                <select
                  className={inputClass}
                  value={idea.pillar ?? ""}
                  onChange={(e) => set({ pillar: e.target.value || null })}
                >
                  <option value="">Sin categoría</option>
                  {project.pillars.map((p) => (
                    <option key={p.name}>{p.name}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          <RefPhotos idea={idea} />
        </div>
      ) : (
        <>
          {!!idea.images?.length && (
            <div className="mb-6 grid grid-cols-3 gap-2">
              {idea.images.map((id) => (
                <Photo key={id} id={id} />
              ))}
            </div>
          )}
          <PlanView idea={idea} accent={project.accent} />
        </>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-5 text-[13px]">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setEditing((e) => !e)} className={darkButtonClass}>
            {editing ? "Listo" : "Editar"}
          </button>
          <button onClick={() => set({ done: !idea.done })} className={buttonClass}>
            {idea.done ? "Marcar como pendiente" : "Marcar como grabada"}
          </button>
          <button onClick={toScript} className={buttonClass}>
            Pasar a guion →
          </button>
        </div>
        <button
          onClick={() => {
            if (!confirm("¿Borrar esta idea?")) return;
            deleteIdea(idea.id);
            onClose();
          }}
          className="text-graphite hover:text-ink"
        >
          Borrar
        </button>
      </div>
    </Modal>
  );
}

/** Fotos de referencia de la idea: se ven en su lámina. Se suben solas a internet. */
function RefPhotos({ idea }: { idea: Idea }) {
  const input = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const images = idea.images ?? [];

  async function add(files: File[]) {
    const list = files.filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setSaving(true);
    const ids: string[] = [];
    for (const file of list) {
      try {
        ids.push(await storeImage(file));
      } catch {
        notify(`No se pudo guardar ${file.name}.`, "error");
      }
    }
    setSaving(false);
    const fresh = currentState().ideas?.find((x) => x.id === idea.id) ?? idea;
    saveIdea({ ...fresh, images: [...(fresh.images ?? []), ...ids] });
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        add([...e.dataTransfer.files]);
      }}
    >
      <span className="mb-1.5 block text-[11px] font-medium tracking-[0.08em] text-graphite uppercase">
        Fotos de referencia
      </span>
      <div className="flex flex-wrap gap-2">
        {images.map((id) => (
          <div key={id} className="group relative h-20 w-20">
            <Photo id={id} />
            <button
              onClick={() => {
                if (isLocal(id)) removeImage(id);
                saveIdea({ ...idea, images: images.filter((x) => x !== id) });
              }}
              className="absolute top-1 right-1 rounded-full bg-white/90 px-1.5 text-[11px] opacity-0 group-hover:opacity-100"
              aria-label="Quitar foto"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-black/20 text-[11px] text-graphite hover:bg-white"
        >
          {saving ? "Guardando…" : "+ fotos"}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            add([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="mt-1.5 text-[12px] text-graphite">
        Se ven en la lámina de la idea. También puedes arrastrarlas aquí.
      </p>
    </div>
  );
}

function Photo({ id }: { id: string }) {
  const url = useImageUrl(id);
  return (
    <div className="aspect-square h-full w-full overflow-hidden rounded-lg bg-[#dedede]">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- foto local, guardada o de Pinterest
        <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      )}
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-black/[0.06] px-3 py-1 text-ink">{children}</span>;
}

function PlanView({ idea, accent }: { idea: Idea; accent: string }) {
  const plan = parsePlan(idea.notes);
  if (!plan.intro.length && !plan.sections.length)
    return (
      <p className="rounded-2xl border border-dashed border-black/15 p-6 text-center text-[14px] text-graphite">
        Todavía no está escrito cómo sería. Toca «Editar» para contarlo.
      </p>
    );

  return (
    <div className="space-y-6 text-[15px] leading-relaxed">
      {plan.intro.length > 0 && <Lines lines={plan.intro} />}
      {plan.sections.map((section, i) => (
        <Section key={i} section={section} accent={accent} />
      ))}
    </div>
  );
}

function Section({ section, accent }: { section: PlanSection; accent: string }) {
  const hook = /^hook/i.test(section.title);
  const copy = /^copy/i.test(section.title);
  const text = section.lines.map((l) => l.text).join("\n");

  return (
    <section
      className={hook ? "rounded-2xl border-l-4 bg-white p-5 shadow-sm" : ""}
      style={hook ? { borderColor: accent } : undefined}
    >
      <h3 className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[11px] font-medium tracking-[0.08em] text-graphite uppercase">
        <span className={hook ? "font-semibold text-ink" : ""}>{section.title}</span>
        {section.sub && <span className="tracking-normal normal-case">{section.sub}</span>}
        {copy && (
          <button
            onClick={() => navigator.clipboard.writeText(text).then(() => notify("Copy copiado"))}
            className="ml-auto rounded-full border border-black/10 px-2.5 py-0.5 tracking-normal normal-case text-ink hover:bg-white"
          >
            Copiar
          </button>
        )}
      </h3>
      <div className={copy ? "rounded-2xl bg-white/70 p-4" : ""}>
        <Lines lines={section.lines} big={hook} />
      </div>
    </section>
  );
}

function Lines({ lines, big }: { lines: PlanLine[]; big?: boolean }) {
  return (
    <div className="space-y-2">
      {lines.map((l, i) =>
        l.kind === "step" ? (
          <div key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">
              {l.n}
            </span>
            <p>
              <Inline text={l.text} />
            </p>
          </div>
        ) : l.kind === "overlay" ? (
          <div key={i} className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[12px] text-graphite">{l.label} en pantalla</span>
            <Overlay text={l.text} big={big} />
          </div>
        ) : (
          <p key={i} className={big ? "text-[17px] leading-snug font-medium" : ""}>
            <Inline text={l.text} />
          </p>
        ),
      )}
    </div>
  );
}

/** Texto con «frases en pantalla» marcadas como en el video, y links que se abren. */
function Inline({ text }: { text: string }) {
  return text.split(/(«[^»]+»|https?:\/\/\S+)/).map((part, i) =>
    part.startsWith("«") ? (
      <Overlay key={i} text={part.slice(1, -1)} />
    ) : /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 align-middle text-[13px] font-medium text-ink underline-offset-2 shadow-sm hover:underline"
      >
        {linkLabel(part)} ↗
      </a>
    ) : (
      part
    ),
  );
}

function Overlay({ text, big }: { text: string; big?: boolean }) {
  return (
    <span
      className={`inline-block bg-ink align-middle font-extrabold tracking-tight text-white uppercase ${
        big ? "rounded-lg px-2.5 py-1 text-[16px]" : "rounded-md px-2 py-0.5 text-[11px]"
      }`}
    >
      {text}
    </span>
  );
}
