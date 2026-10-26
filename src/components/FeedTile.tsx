"use client";

import { useImageUrl } from "@/lib/images";
import type { Post } from "@/lib/types";

function FormatIcon({ format, color }: { format: Post["format"]; color: string }) {
  if (format.startsWith("Reel"))
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={color} aria-label="Reel">
        <path d="M8 5.5v13l11-6.5z" />
      </svg>
    );
  if (format === "Post carrusel")
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke={color} strokeWidth="2" aria-label="Carrusel">
        <rect x="7" y="7" width="13" height="13" rx="2" />
        <path d="M4 16V6a2 2 0 0 1 2-2h10" />
      </svg>
    );
  return null;
}

/**
 * Un cuadro del grid. `planned` (etiqueta, ej. "Nuevo · 29 oct") lo marca como espacio para un post nuevo:
 * borde punteado y etiqueta negra, para distinguirlo de lo ya subido.
 */
export function FeedTile({ post, planned }: { post: Post; planned?: string }) {
  const url = useImageUrl(post.image);

  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden ${planned && !url ? "bg-white/70" : "bg-[#dedede]"}`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob: URL local
        <img src={url} alt={post.title} className="absolute inset-0 h-full w-full object-cover object-top" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center">
          <span className="text-[15px] leading-tight font-semibold tracking-[-0.02em]">
            {post.title || "sin título"}
          </span>
          {planned && <span className="text-[11px] text-graphite">{post.format}</span>}
        </div>
      )}
      {/* Las fotos traídas de Instagram ya traen su ícono */}
      {(planned || !url) && (
        <div className="absolute top-2.5 right-2.5 drop-shadow">
          <FormatIcon format={post.format} color={url ? "white" : "#1d1818"} />
        </div>
      )}
      {planned && (
        <>
          <div className="pointer-events-none absolute inset-1.5 rounded-[3px] border-[1.5px] border-dashed border-ink/70" />
          <span className="absolute top-2.5 left-2.5 rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-white">
            {planned}
          </span>
        </>
      )}
    </div>
  );
}

/** Orden del grid de Instagram: fijados primero, luego lo más nuevo; lo publicado sin fecha va al final. */
export function feedPosts(posts: Post[], slug: string) {
  return posts
    .filter((p) => p.project === slug && p.format !== "Stories")
    .sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      if (a.date !== b.date) {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date < b.date ? 1 : -1;
      }
      return b.createdAt - a.createdAt;
    });
}
