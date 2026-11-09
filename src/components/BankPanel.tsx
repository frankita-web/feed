"use client";

import { useRef, useState } from "react";
import { BANK_LIMIT, deleteBankItem, useBank } from "@/lib/bank";
import { shortDate } from "@/lib/dates";
import { useImageUrl } from "@/lib/images";
import { storeMedia } from "@/lib/media";
import { organizeInFeed } from "@/lib/organize";
import { notify } from "@/lib/toast";
import { addToBank } from "@/lib/store";
import type { BankItem, Post, Project } from "@/lib/types";
import { buttonClass, darkButtonClass } from "./Modal";

/** Banco de imágenes: fotos y videos que todavía no están en el feed. Se arrastran a "Con lo nuevo". */
export function BankPanel({
  project,
  bank,
  posts,
  onUse,
}: {
  project: Project;
  bank: BankItem[];
  posts: Post[];
  /** Ponerla arriba de "Con lo nuevo". */
  onUse: (item: BankItem) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [over, setOver] = useState(false);
  // Elegir fotos para que la IA las ordene en el feed.
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  const [organizing, setOrganizing] = useState(false);
  const mine = bank.filter((b) => b.project === project.slug);
  const pending = mine.filter((b) => !b.inFeed);

  const toggle = (id: string) =>
    setChosen((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else if (next.size < 20) next.add(id);
      return next;
    });

  const organize = async () => {
    if (!chosen?.size) return;
    setOrganizing(true);
    notify(`Organizando ${chosen.size} fotos en el feed…`, "loading", "bank-ai");
    try {
      const { posts: created, withoutAi } = await organizeInFeed(
        project,
        mine.filter((b) => chosen.has(b.id)),
        posts,
      );
      const dates = created.map((p) => p.date).filter((d): d is string => !!d).sort();
      notify(
        `Listo: ${created.length} ${created.length === 1 ? "post nuevo" : "posts nuevos"}${
          dates.length ? ` del ${shortDate(dates[0])} al ${shortDate(dates[dates.length - 1])}` : ""
        } en “Con lo nuevo”. ${
          withoutAi
            ? "Quedaron sin copy: la IA todavía no está activada en Vercel."
            : "Revisa los copys antes de publicar."
        }`,
        "ok",
        "bank-ai",
      );
      setChosen(null);
    } catch (error) {
      notify((error as Error).message, "error", "bank-ai");
    }
    setOrganizing(false);
  };
  const { moving, failed, used } = useBank();
  const megas = (bytes: number) => Math.round(bytes / 1024 ** 2);

  const upload = async (files: File[]) => {
    const list = files.filter((f) => /^(image|video)\//.test(f.type));
    if (!list.length) return;
    const size = list.reduce((sum, f) => sum + f.size, 0);
    if (used + size > BANK_LIMIT) {
      alert(
        `No cabe: el banco usa ${megas(used)} MB de 1 GB y esto pesa ${megas(size)} MB. Quita algo del banco primero.`,
      );
      return;
    }
    setUploading(list.length);
    const items: BankItem[] = [];
    for (const file of list) {
      const media = await storeMedia([file], false).catch(() => null);
      setUploading((n) => n - 1);
      if (!media) {
        alert(`No se pudo guardar "${file.name}" en este navegador.`);
        continue;
      }
      items.push({
        id: crypto.randomUUID(),
        project: project.slug,
        name: file.name.replace(/\.[^.]+$/, ""),
        image: media.cover,
        files: media.files,
        createdAt: Date.now(),
      });
    }
    if (items.length) addToBank(items);
  };

  return (
    <section
      className={`silver mb-10 rounded-[24px] p-5 transition ${over ? "ring-2 ring-ink" : ""}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setOver(false);
        upload(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl leading-none font-semibold tracking-[-0.04em]">
            Banco de imágenes
          </h2>
          <p className="mt-1 text-[13px] text-graphite">
            {mine.length
              ? `${mine.length} sin subir · arrástralas a “Con lo nuevo” para probar dónde van`
              : "Sube aquí las fotos y videos que todavía no van al feed"}
          </p>
          <p className="mt-0.5 text-[11px] text-graphite">
            {failed
              ? `Quedan ${moving} sin guardar en internet: siguen en este navegador y se reintenta al volver a entrar.`
              : moving
                ? `Guardando en internet… faltan ${moving}. No cierres la página.`
                : `Guardado en internet · ${megas(used)} MB de 1 GB`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {chosen ? (
            <>
              <button
                onClick={() => setChosen(new Set(pending.slice(0, 20).map((b) => b.id)))}
                className={buttonClass}
              >
                Elegir las que faltan
              </button>
              <button onClick={() => setChosen(null)} disabled={organizing} className={buttonClass}>
                Cancelar
              </button>
              <button
                onClick={organize}
                disabled={!chosen.size || organizing}
                className={darkButtonClass}
              >
                {organizing ? "Pensando el orden…" : `Organizar en el feed (${chosen.size})`}
              </button>
            </>
          ) : (
            mine.length > 0 && (
              <button
                onClick={() => {
                  setChosen(new Set());
                }}
                className={buttonClass}
                title="La IA ordena las fotos en el feed con fecha y copy"
              >
                ✨ Organizar en el feed
              </button>
            )
          )}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading > 0}
          className={buttonClass}
        >
          {uploading ? `Procesando… (${uploading})` : "+ Subir al banco"}
        </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            upload(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {chosen && (
        <p className="mb-2 text-[12px] text-graphite">
          Toca las fotos que quieres ordenar (hasta 20). La IA les pone fecha, hora y copy, y
          alterna claras y oscuras. Las fotos se quedan en el banco.
        </p>
      )}
      {mine.length ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {mine.map((item) => (
            <BankTile
              key={item.id}
              item={item}
              onUse={() => onUse(item)}
              onRemove={() => deleteBankItem(item)}
              chosen={chosen ? chosen.has(item.id) : undefined}
              onToggle={() => toggle(item.id)}
            />
          ))}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-2xl border-[1.5px] border-dashed border-black/15 py-8 text-[13px] text-graphite hover:border-black/30 hover:text-ink"
        >
          Arrastra fotos aquí o toca para elegirlas
        </button>
      )}
    </section>
  );
}

function BankTile({
  item,
  onUse,
  onRemove,
  chosen,
  onToggle,
}: {
  item: BankItem;
  onUse: () => void;
  onRemove: () => void;
  /** undefined = no se está eligiendo. */
  chosen?: boolean;
  onToggle: () => void;
}) {
  const url = useImageUrl(item.image);
  const video = item.files.some((f) => f.type.startsWith("video/"));
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", `bank:${item.id}`)}
      className="group relative aspect-[3/4] w-28 shrink-0 cursor-grab overflow-hidden rounded-xl bg-[#dedede] active:cursor-grabbing"
      title={item.name}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- archivo local
        <img src={url} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {video && (
        <span className="absolute top-1.5 left-1.5 rounded-full bg-ink/70 px-1.5 text-[10px] text-white">
          ▶
        </span>
      )}
      {item.inFeed && (
        <span className="absolute inset-x-1.5 top-1.5 truncate rounded-full bg-white/95 px-1.5 py-0.5 text-center text-[9px] font-medium">
          En el feed{item.inFeed.date ? ` · ${shortDate(item.inFeed.date)}` : ""}
        </span>
      )}
      {chosen !== undefined && (
        <button
          onClick={onToggle}
          aria-pressed={chosen}
          aria-label={chosen ? "Quitar de la selección" : "Elegir esta foto"}
          className={`absolute inset-0 flex items-end justify-end p-1.5 transition ${
            chosen ? "bg-ink/25 ring-2 ring-ink ring-inset" : "hover:bg-white/20"
          }`}
        >
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[11px] text-white shadow ${
              chosen ? "bg-ink" : "bg-black/20"
            }`}
          >
            {chosen ? "✓" : ""}
          </span>
        </button>
      )}
      <div className={`absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1 opacity-0 transition group-hover:opacity-100 ${chosen !== undefined ? "hidden" : ""}`}>
        <button
          onClick={onUse}
          className="h-6 rounded-full bg-white/95 px-2 text-[10px] font-medium shadow"
          title="Ponerla arriba de “Con lo nuevo”"
        >
          Al feed
        </button>
        <button
          onClick={() => confirm("¿Quitar del banco? Se borra también de internet.") && onRemove()}
          className="h-6 w-6 rounded-full bg-white/95 text-[12px] shadow"
          aria-label="Quitar del banco"
        >
          ×
        </button>
      </div>
    </div>
  );
}
