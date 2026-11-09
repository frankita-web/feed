"use client";

import { dismiss, useToasts } from "@/lib/toast";

const ICON = { loading: "", ok: "✓", error: "!" } as const;

/** Avisos flotantes a la derecha, sobre un fondo difuminado. */
export function Toaster() {
  const toasts = useToasts();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-20 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="toast-in pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-left text-[13px] leading-snug text-ink shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl backdrop-saturate-150"
          title="Cerrar"
        >
          <span
            className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
              t.kind === "error" ? "bg-red-600 text-white" : t.kind === "ok" ? "bg-ink text-white" : ""
            }`}
          >
            {t.kind === "loading" ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
            ) : (
              ICON[t.kind]
            )}
          </span>
          <span className="flex-1">{t.text}</span>
        </button>
      ))}
    </div>
  );
}
