import { paletteOf, type Project } from "@/lib/types";

/** Colores casi blancos no aportan a la esfera. */
const isWhite = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) > 240 && ((n >> 8) & 255) > 240 && (n & 255) > 240;
};

/** Esfera de color difuminada con la paleta del proyecto. */
export function Orb({ project, className = "" }: { project: Project; className?: string }) {
  const colors = paletteOf(project).filter((c) => !isWhite(c));
  const [a = project.accent, b = a, c = b] = colors;

  return (
    <div
      className={`relative isolate overflow-hidden rounded-full ${className}`}
      style={{ background: a }}
    >
      <div
        className="orb-spin absolute -inset-1/4"
        style={{
          background: `conic-gradient(from 20deg, ${[...colors, a].join(", ")})`,
          filter: "blur(22px)",
        }}
      />
      <div
        className="orb-drift absolute inset-0"
        style={{
          background: `radial-gradient(circle at 30% 65%, ${c}cc, transparent 40%), radial-gradient(circle at 70% 35%, ${b}, transparent 35%)`,
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
