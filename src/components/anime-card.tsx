import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { CoverImage } from "@/components/cover-image";
import type { AnimeCard as AnimeCardData, Lang } from "@/lib/anime/types";
import { cn } from "@/lib/utils";

const CARD =
  "group flex flex-col gap-3 rounded-xl p-3 transition-colors duration-[var(--motion-fast)] hover:bg-hover";

export function AnimeCard({
  anime,
  fluid = false,
  caption,
  progress,
  watch,
}: {
  anime: AnimeCardData;
  /** Remplit la cellule d'une grille au lieu d'une largeur fixe (rangées horizontales). */
  fluid?: boolean;
  caption?: string;
  /** Avancement 0..1 affiché en barre sous l'affiche. */
  progress?: number;
  /** Si présent, la carte ouvre directement cet épisode au lieu de la fiche. */
  watch?: { id: string; lang: Lang };
}) {
  const size = cn(CARD, fluid ? "w-full" : "w-[168px] shrink-0 max-md:w-[148px]");
  const body = (
    <>
      <div className="relative">
        <CoverImage
          src={anime.image}
          alt=""
          seed={anime.slug}
          className="aspect-[2/3] w-full shadow-lg"
        />
        <span className="absolute right-2 bottom-2 flex size-11 items-center justify-center rounded-full bg-accent text-accent-fg opacity-0 shadow-lg transition-opacity duration-[var(--motion-fast)] group-hover:opacity-100 max-md:hidden">
          <Play className="ml-0.5 size-5 fill-current" />
        </span>
        {progress != null ? (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
            <span
              className="block h-full bg-accent"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold">{anime.title}</p>
        {caption ? <p className="truncate text-xs text-muted">{caption}</p> : null}
      </div>
    </>
  );

  return watch ? (
    <Link to="/watch" search={{ id: watch.id, lang: watch.lang }} className={size}>
      {body}
    </Link>
  ) : (
    <Link to="/anime/$slug" params={{ slug: anime.slug }} search={{ season: "" }} className={size}>
      {body}
    </Link>
  );
}
