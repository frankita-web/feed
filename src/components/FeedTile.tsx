"use client";

import { useImageUrl } from "@/lib/images";
import type { Post, Project } from "@/lib/types";

function FormatIcon({ format }: { format: Post["format"] }) {
  if (format.startsWith("Reel"))
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="white" aria-label="Reel">
        <path d="M8 5.5v13l11-6.5z" />
      </svg>
    );
  if (format === "Post carrusel")
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="white" strokeWidth="2" aria-label="Carrusel">
        <rect x="7" y="7" width="13" height="13" rx="2" />
        <path d="M4 16V6a2 2 0 0 1 2-2h10" />
      </svg>
    );
  return null;
}

export function FeedTile({
  post,
  project,
  badge,
  small,
}: {
  post: Post;
  project: Project;
  badge?: string;
  small?: boolean;
}) {
  const url = useImageUrl(post.image);

  return (
    <div
      className="relative aspect-[4/5] w-full overflow-hidden"
      style={{ background: project.accent }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob: URL local
        <img src={url} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-2 text-center">
          <span
            className={`font-semibold leading-tight text-white ${small ? "text-[8px]" : "text-sm"}`}
          >
            {post.title || "Sin título"}
          </span>
        </div>
      )}
      {!small && (
        <>
          <div className="absolute top-1.5 right-1.5 drop-shadow">
            <FormatIcon format={post.format} />
          </div>
          {badge && (
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-800">
              {badge}
            </span>
          )}
        </>
      )}
    </div>
  );
}

/** Orden del grid de Instagram: lo más nuevo arriba; lo publicado sin fecha va al final. */
export function feedPosts(posts: Post[], slug: string) {
  return posts
    .filter((p) => p.project === slug && p.format !== "Stories")
    .sort((a, b) => {
      if (a.date !== b.date) {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date < b.date ? 1 : -1;
      }
      return b.createdAt - a.createdAt;
    });
}
