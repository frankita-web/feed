import type { Post, Project, Status } from "@/lib/types";

const DEFAULT: Record<Status, string> = {
  pendiente: "#e5003e",
  listo: "#3d7a5c",
  publicado: "#1d1818",
};

/** Color de cada estado, tomado de la paleta del cliente. */
export function statusColor(status: Post["status"], project: Project) {
  return project.statusColors?.[status] ?? DEFAULT[status];
}

/** Puntito de estado; con borde para que los colores claros se vean sobre el gris. */
export function StatusDot({
  status,
  project,
  className = "h-2 w-2",
}: {
  status: Status;
  project: Project;
  className?: string;
}) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ring-1 ring-black/15 ${className}`}
      style={{ background: statusColor(status, project) }}
    />
  );
}
