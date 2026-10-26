import type { Project } from "@/lib/types";

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
