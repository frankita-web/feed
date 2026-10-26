"use client";

import { useEffect, type ReactNode } from "react";
import { Bow } from "./Bow";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#5a2f3d]/25 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[32px] border border-petal bg-cream p-7 shadow-[0_30px_60px_-25px_rgb(120_50_75/0.45)] sm:rounded-[32px]"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bow className="h-5 w-8" />
            <h2 className="font-display text-3xl leading-none font-medium italic">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full px-2 text-2xl leading-none text-mauve hover:text-ink"
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
      <span className="mb-1.5 block text-[11px] font-medium tracking-[0.18em] text-mauve uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-petal bg-white px-3.5 py-2 text-sm text-ink outline-none placeholder:text-mauve/60 focus:border-rose focus:ring-4 focus:ring-blush";

export const buttonClass =
  "rounded-full border border-petal bg-white/80 px-4 py-1.5 text-sm text-ink transition hover:border-rose hover:bg-white";

export function Chips<T extends string>({
  options,
  value,
  onChange,
  label = (o) => o,
  color,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  label?: (o: T) => string;
  color: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className="rounded-full border px-3 py-1 text-sm transition"
            style={
              active
                ? { background: color, borderColor: color, color: "white" }
                : { borderColor: "var(--color-petal)", background: "white" }
            }
          >
            {label(o)}
          </button>
        );
      })}
    </div>
  );
}
