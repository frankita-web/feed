/** Moñito decorativo. */
export function Bow({ color = "#e9a3b8", className = "h-6 w-9" }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden="true">
      <g fill={color} stroke="rgb(90 30 50 / 0.18)" strokeWidth="1.2" strokeLinejoin="round">
        <path d="M30 22 L20 42 L25.5 39.5 L28 43 L33 23 Z" />
        <path d="M34 22 L44 42 L38.5 39.5 L36 43 L31 23 Z" />
        <path d="M32 18 C25 5 9 1 5.5 10 C2.5 18 9 25.5 18 24.5 C24 24 28.5 22 32 20.5 Z" />
        <path d="M32 18 C39 5 55 1 58.5 10 C61.5 18 55 25.5 46 24.5 C40 24 35.5 22 32 20.5 Z" />
        <ellipse cx="32" cy="19.5" rx="4.6" ry="5.4" />
      </g>
      <g fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="1.4" strokeLinecap="round">
        <path d="M12 11 C16 8 22 10 26 15" />
        <path d="M52 11 C48 8 42 10 38 15" />
      </g>
    </svg>
  );
}
