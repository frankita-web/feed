"use client";

import { useEffect, useState } from "react";
import { upsertPosts } from "@/lib/store";
import { notify } from "@/lib/toast";
import type { Post, Project, State } from "@/lib/types";
import { Modal } from "./Modal";

type Backup = { path: string; at: string; size: number };

const REASONS: Record<string, string> = {
  "antes-de-reordenar": "Antes de «Reordenar»",
  "antes-de-poner-fechas": "Antes de «Poner fechas en este orden»",
  "antes-de-ordenar-por-fecha": "Antes de «Ordenar por fecha»",
  "antes-de-ajustar-fechas": "Antes de «Ajustar fechas al orden»",
  anterior: "Versión anterior (guardada sola)",
  reemplazado: "Versión que se reemplazó por otra",
  navegador: "Copia de un navegador",
};

/** «respaldos/estado-2026-11-18T20-15-30-123Z-antes-de-reordenar-AbC123.json» → el motivo. */
function reasonOf(path: string) {
  const reason = path
    .replace(/^respaldos\/estado-/, "")
    .replace(/^\d{4}-\d{2}-\d{2}T[\d-]+Z-?/, "")
    .replace(/-[A-Za-z0-9]+\.json$/, "")
    .replace(/\.json$/, "");
  return REASONS[reason] ?? "Copia guardada";
}

const when = (at: string) =>
  new Date(at).toLocaleString("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Recuperar las fechas de los posts nuevos desde una copia guardada en internet (por ejemplo, la
 * de antes de apretar «Reordenar»). Solo cambia las fechas de lo que no está publicado.
 */
export function RestoreDates({
  project,
  posts,
  onClose,
}: {
  project: Project;
  posts: Post[];
  onClose: () => void;
}) {
  const [backups, setBackups] = useState<Backup[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/estado/respaldos", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { backups: Backup[] }) => setBackups(data.backups))
      .catch(() =>
        setError("No se pudieron traer las copias guardadas. Intenta de nuevo en un rato."),
      );
  }, []);

  async function restore(backup: Backup) {
    setBusy(backup.path);
    try {
      const response = await fetch(
        `/api/estado/respaldos?path=${encodeURIComponent(backup.path)}`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error(String(response.status));
      const old = (await response.json()) as State;
      const before = new Map(old.posts.map((p) => [p.id, p]));
      const changed = posts.flatMap((p) => {
        const o = before.get(p.id);
        if (!o || p.project !== project.slug || p.status === "publicado") return [];
        if ((o.date ?? null) === (p.date ?? null) && o.order === p.order) return [];
        return [{ ...p, date: o.date ?? null, order: o.order }];
      });
      if (!changed.length) {
        notify("En esa copia las fechas de los posts nuevos son iguales a las de ahora.", "ok");
        return;
      }
      if (
        !confirm(
          `Las fechas de ${changed.length} posts nuevos vuelven a como estaban el ${when(backup.at)}. Lo demás no se toca, y si no era esa, se deshace con ↶. ¿Seguir?`,
        )
      )
        return;
      upsertPosts(changed);
      notify(`Listo: ${changed.length} posts volvieron a su fecha de antes.`, "ok");
      onClose();
    } catch {
      notify("No se pudo abrir esa copia. Intenta con otra.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal title="Recuperar fechas" onClose={onClose}>
      <p className="-mt-3 mb-5 text-[13px] text-graphite">
        Elige una copia guardada de antes del cambio: los posts nuevos de {project.name} vuelven a
        las fechas (y al orden) que tenían ahí. Lo publicado y lo demás no se toca.
      </p>
      {error && <p className="text-[13px] text-[#b42318]">{error}</p>}
      {!backups && !error && <p className="text-[13px] text-graphite">Buscando copias…</p>}
      {backups && !backups.length && (
        <p className="rounded-2xl border border-dashed border-black/15 p-5 text-center text-[13px] text-graphite">
          Todavía no hay copias guardadas. Desde ahora se guarda una sola antes de «Reordenar» y de
          «Poner fechas».
        </p>
      )}
      {backups && backups.length > 0 && (
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
          {backups.map((b) => (
            <li key={b.path}>
              <button
                onClick={() => restore(b)}
                disabled={!!busy}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-left text-[13px] transition hover:bg-white disabled:opacity-50"
              >
                <span>
                  <span className="block font-medium capitalize">{when(b.at)}</span>
                  <span className="text-graphite">{reasonOf(b.path)}</span>
                </span>
                <span className="shrink-0 text-graphite">
                  {busy === b.path ? "Abriendo…" : "Usar esta →"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
