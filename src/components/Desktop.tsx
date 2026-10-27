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
