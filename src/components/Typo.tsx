import type { Project } from "@/lib/types";

const SWIRL = new Set(["S", "E"]);

/** Texto de máquina de escribir con algunas S/E cambiadas por letras en cursiva. */
export function Swirl({ text, className = "" }: { text: string; className?: string }) {
  let n = 0;
  return (
    <span className={`font-mono uppercase ${className}`}>
      {[...text].map((ch, i) =>
        SWIRL.has(ch.toUpperCase()) && n++ % 2 === 0 ? (
          <span
            key={i}
            className="inline-block font-script text-[1.45em] leading-[0] normal-case"
          >
            {ch.toLowerCase()}
          </span>
        ) : (
          ch
        ),
      )}
    </span>
  );
}

/** Puntitos sueltos, como los del afiche. Posiciones en % del contenedor. */
export function Dots({
  at,
  className = "",
}: {
  at: [left: number, top: number][];
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      {at.map(([left, top], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-ink"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: i % 3 === 0 ? 4 : 3,
            height: i % 3 === 0 ? 4 : 3,
          }}
        />
      ))}
    </span>
  );
}

const GREEN = "#3d7a5c";

/** Esfera de color difuminada con los colores del proyecto. */
export function Orb({ project, className = "" }: { project: Project; className?: string }) {
  return (
    <div
      className={`relative isolate overflow-hidden rounded-full ${className}`}
      style={{ background: project.accent }}
    >
      <div
        className="orb-spin absolute -inset-1/4"
        style={{
          background: `conic-gradient(from 20deg, ${project.accent}, ${GREEN}, ${project.bg}, #f7a37a, ${project.accent})`,
          filter: "blur(22px)",
        }}
      />
      <div
        className="orb-drift absolute inset-0"
        style={{
          background: `radial-gradient(circle at 30% 65%, ${GREEN}cc, transparent 40%), radial-gradient(circle at 70% 35%, #ffffffaa, transparent 30%)`,
          filter: "blur(10px)",
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 28%, rgb(255 255 255 / 0.35), transparent 42%), radial-gradient(circle at 60% 90%, rgb(0 0 0 / 0.18), transparent 50%)",
        }}
      />
    </div>
  );
}
