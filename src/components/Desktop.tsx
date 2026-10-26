import type { ReactNode } from "react";

/** Carpeta azul estilo macOS. */
export function Folder({ className = "h-16 w-20" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 62" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="folder-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fd0fb" />
          <stop offset="1" stopColor="#5fa6ea" />
        </linearGradient>
      </defs>
      <path d="M3 9a5 5 0 0 1 5-5h19.5a4 4 0 0 1 3 1.4L35 10h37a5 5 0 0 1 5 5v6H3z" fill="#5b9ee3" />
      <rect x="3" y="15" width="74" height="44" rx="5" fill="url(#folder-front)" />
      <rect x="3" y="15" width="74" height="1.4" fill="#ffffff" opacity=".55" />
    </svg>
  );
}

/** Recuadro de selección con manijas, como al editar un texto en Keynote/Figma. */
export function Selected({ children, cursor = true }: { children: ReactNode; cursor?: boolean }) {
  const handles = [
    "left-0 top-0",
    "left-1/2 top-0",
    "right-0 top-0",
    "left-0 top-1/2",
    "right-0 top-1/2",
    "left-0 bottom-0",
    "left-1/2 bottom-0",
    "right-0 bottom-0",
  ];
  return (
    <span className="relative inline-block px-[0.12em]">
      {children}
      <span aria-hidden="true" className="absolute inset-0 border border-ink/45" />
      {handles.map((h) => (
        <span
          key={h}
          aria-hidden="true"
          className={`absolute ${h} h-[7px] w-[7px] border border-ink/60 bg-white ${
            h.includes("right-0") ? "translate-x-1/2" : "-translate-x-1/2"
          } ${h.includes("bottom-0") ? "translate-y-1/2" : "-translate-y-1/2"}`}
        />
      ))}
      {cursor && (
        <svg
          viewBox="0 0 16 24"
          aria-hidden="true"
          className="absolute -right-[0.35em] -bottom-[0.55em] h-[0.32em] min-h-4 w-auto"
        >
          <path d="M1 1v19l5-5 3.5 7.5 3-1.4L9 13.6h7z" fill="white" stroke="black" strokeWidth="1.3" />
        </svg>
      )}
    </span>
  );
}
