"use client";

import { useEffect, type ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`silver max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] p-7 sm:rounded-[28px] ${wide ? "max-w-4xl" : "max-w-lg"}`}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-2xl leading-tight font-semibold tracking-[-0.03em]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full px-2 text-2xl leading-none text-graphite hover:text-ink"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium tracking-[0.08em] text-graphite uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-black/10 bg-white/90 px-3.5 py-2 text-sm text-ink outline-none placeholder:text-graphite/60 focus:border-black/40";

/** Botón claro, como "Learn more" de la referencia. */
export const buttonClass =
  "rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-[13px] text-ink backdrop-blur transition hover:bg-white";

/** Botón negro, como "Use v4" de la referencia. */
export const darkButtonClass =
  "rounded-full bg-ink px-5 py-1.5 text-[13px] font-medium text-white transition hover:bg-black disabled:opacity-50";

export function Chips<T extends string>({
  options,
  value,
  onChange,
  label = (o) => o,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  label?: (o: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`rounded-full border px-3 py-1 text-[13px] transition ${
            o === value
              ? "border-ink bg-ink text-white"
              : "border-black/10 bg-white/80 text-ink hover:bg-white"
          }`}
        >
          {label(o)}
        </button>
      ))}
    </div>
  );
}
