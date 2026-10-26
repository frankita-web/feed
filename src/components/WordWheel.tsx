"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type WheelItem = { key: string; label: string; hint?: ReactNode };

const RADIUS = 520;
const STEP = 0.066; // radianes entre palabras
const SPAN = 7; // palabras visibles hacia arriba y hacia abajo

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Lista de palabras sobre un arco (como el selector de la referencia).
 * Con `loop`, `index` no tiene límites y la lista se repite como rueda infinita.
 */
export function WordWheel({
  items,
  index,
  onChange: setIndex,
  onPick,
  label,
  loop = true,
}: {
  items: WheelItem[];
  index: number;
  onChange: (index: number) => void;
  onPick: (item: WheelItem) => void;
  label: string;
  loop?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onChange = (i: number) => setIndex(loop ? i : Math.max(0, Math.min(items.length - 1, i)));
  const latest = useRef({ index, onChange });
  useEffect(() => {
    latest.current = { index, onChange };
  });

  // Rueda del mouse / trackpad: un paso cada ~40px, sin mover la página.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) < 40) return;
      const { index, onChange } = latest.current;
      onChange(index + Math.sign(acc));
      acc = 0;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const touchY = useRef<number | null>(null);

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="listbox"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") onChange(index + 1);
        else if (e.key === "ArrowUp") onChange(index - 1);
        else if (e.key === "Enter") onPick(items[mod(index, items.length)]);
        else return;
        e.preventDefault();
      }}
      onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
      onTouchMove={(e) => {
        if (touchY.current === null) return;
        const dy = touchY.current - e.touches[0].clientY;
        if (Math.abs(dy) > 32) {
          onChange(index + Math.sign(dy));
          touchY.current = e.touches[0].clientY;
        }
      }}
      className="relative h-[460px] cursor-ns-resize touch-none overflow-hidden outline-none select-none"
      style={{
        maskImage: "linear-gradient(transparent, black 18%, black 82%, transparent)",
      }}
    >
      {Array.from({ length: SPAN * 2 + 1 }, (_, i) => {
        const d = i - SPAN;
        const abs = index + d;
        if (!loop && (abs < 0 || abs >= items.length)) return null;
        const item = items[mod(abs, items.length)];
        const a = d * STEP;
        const selected = d === 0;
        return (
          <button
            key={abs}
            type="button"
            role="option"
            aria-selected={selected}
            tabIndex={-1}
            onClick={() => (selected ? onPick(item) : onChange(abs))}
            className="absolute top-1/2 left-6 flex origin-left -translate-y-1/2 items-center gap-3 text-[22px] whitespace-nowrap transition-[transform,opacity] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
            style={{
              transform: `translate(${RADIUS * Math.cos(a) - RADIUS}px, ${RADIUS * Math.sin(a)}px) rotate(${a}rad)`,
              opacity: selected ? 1 : Math.max(0, 0.75 - Math.abs(d) * 0.08),
            }}
          >
            {selected ? (
              <>
                <span className="text-graphite/50">[</span>
                <span className="text-ink">{item.label}</span>
                <span className="rounded-full bg-white px-1.5 text-xs text-graphite shadow-sm">
                  ‹ ›
                </span>
                <span className="text-graphite/50">]</span>
                {item.hint && <span className="text-base text-graphite/60">{item.hint}</span>}
              </>
            ) : (
              <span className="text-ink/80">{item.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
