"use client";

import { useImageUrl } from "@/lib/images";
import type { Project } from "@/lib/types";

/** Logo del cliente en círculo. Sin logo: su nombre sobre el color principal. */
export function Logo({ project, className = "" }: { project: Project; className?: string }) {
  const url = useImageUrl(project.logo ?? null);
  const n = parseInt(project.accent.slice(1), 16);
  const light = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10 [container-type:inline-size] ${className}`}
      style={{ background: project.accent, color: light ? "#161616" : "#fff" }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo local o subido
        <img src={url} alt={project.name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="text-[16cqw] font-extrabold tracking-[0.02em] uppercase">
          {project.name}
        </span>
      )}
    </div>
  );
}
