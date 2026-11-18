"use client";

import { useEffect } from "react";
import { redo, undo, useHistory } from "@/lib/store";
import { notify } from "@/lib/toast";

/**
 * Flechitas para deshacer y rehacer (también con ⌘Z / Ctrl+Z y ⇧⌘Z / Ctrl+Y), para los cambios
 * hechos en este navegador mientras la página está abierta.
 */
export function UndoButtons() {
  const { canUndo, canRedo } = useHistory();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      // Mientras se escribe, ⌘Z deshace el texto, como siempre.
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))
        return;
      if (document.querySelector('[role="dialog"]')) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        if (!undo()) return;
        e.preventDefault();
        notify("Deshecho ↶", "ok", "historial");
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        if (!redo()) return;
        e.preventDefault();
        notify("Rehecho ↷", "ok", "historial");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const button =
    "flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/70 text-[17px] leading-none text-ink transition hover:bg-white disabled:opacity-30";

  return (
    <div className="flex items-center gap-1 tracking-normal">
      <button
        onClick={() => undo() && notify("Deshecho ↶", "ok", "historial")}
        disabled={!canUndo}
        className={button}
        aria-label="Deshacer"
        title="Deshacer el último cambio (⌘Z / Ctrl+Z)"
      >
        ↶
      </button>
      <button
        onClick={() => redo() && notify("Rehecho ↷", "ok", "historial")}
        disabled={!canRedo}
        className={button}
        aria-label="Rehacer"
        title="Rehacer (⇧⌘Z / Ctrl+Y)"
      >
        ↷
      </button>
    </div>
  );
}
