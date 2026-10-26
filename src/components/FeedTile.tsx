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

export function FeedTile({
  post,
  badge,
  small,
}: {
  post: Post;
  badge?: string;
  small?: boolean;
}) {
  const url = useImageUrl(post.image);

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#dedede]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob: URL local
        <img src={url} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-2 text-center">
          <span
            className={`leading-tight font-semibold tracking-[-0.02em] ${small ? "text-[8px]" : "text-[15px]"}`}
          >
            {post.title || "sin título"}
          </span>
        </div>
      )}
      {!small && (
        <>
          <div className="absolute top-2.5 right-2.5 drop-shadow">
            <FormatIcon format={post.format} color={url ? "white" : "#1d1818"} />
          </div>
          {badge && (
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] whitespace-nowrap shadow-sm">
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
