"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function LikeButton({
  target,
  id,
  initialCount = 0,
  className = ""
}: {
  target: "collection" | "nft";
  id?: string;
  initialCount?: number;
  className?: string;
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string>();

  const base = target === "collection" ? `/api/collections/${id}` : `/api/nft-items/${id}`;

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!id) return;
    api<{ liked: boolean; likeCount: number }>(`${base}/like-status`)
      .then((result) => {
        setLiked(result.liked);
        setCount(result.likeCount);
      })
      .catch(() => undefined);
  }, [base, id]);

  async function toggle() {
    if (!id) return;
    setError(undefined);
    const nextLiked = !liked;
    const previous = { liked, count };
    setLiked(nextLiked);
    setCount((value) => Math.max(value + (nextLiked ? 1 : -1), 0));
    try {
      const result = await api<{ liked: boolean; likeCount: number }>(`${base}/like`, { method: nextLiked ? "POST" : "DELETE" });
      setLiked(result.liked);
      setCount(result.likeCount);
    } catch (err) {
      setLiked(previous.liked);
      setCount(previous.count);
      setError(err instanceof Error ? err.message : "Sign in with wallet to like");
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={!id}
        onClick={toggle}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition ${liked ? "border-rose/40 bg-rose/10 text-rose" : "border-white/10 bg-white/[0.04] text-muted hover:text-white"}`}
      >
        <Heart size={16} fill={liked ? "currentColor" : "none"} />
        {liked ? "Liked" : "Like"} · {count}
      </button>
      {error ? <p className="mt-2 text-xs text-rose">{error}</p> : null}
    </div>
  );
}
