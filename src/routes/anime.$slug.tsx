import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Heart } from "lucide-react";
import { CoverImage } from "@/components/cover-image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAnime, fetchEpisodes } from "@/lib/anime/functions";
import { useLibraryStore } from "@/lib/anime/library-store";
import { LangToggle } from "@/components/lang-toggle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/anime/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({
    season: typeof search.season === "string" ? search.season : "",
  }),
  component: AnimePage,
});

function AnimePage() {
  const { slug } = Route.useParams();
  const { season: seasonParam } = Route.useSearch();
  const navigate = Route.useNavigate();

  const anime = useQuery({
    queryKey: ["anime", slug],
    queryFn: () => fetchAnime({ data: { slug } }),
  });

  const seasons = anime.data?.seasons ?? [];
  const season = seasons.find((s) => s.base === seasonParam) ?? seasons[0];

  const episodes = useQuery({
    queryKey: ["episodes", slug, season?.base],
    queryFn: () => fetchEpisodes({ data: { slug, base: season!.base } }),
    enabled: Boolean(season),
  });

  const lang = useLibraryStore((s) => s.lang);
  const setLang = useLibraryStore((s) => s.setLang);
  const favorite = useLibraryStore((s) => Boolean(s.favorites[slug]));
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const progress = useLibraryStore((s) => s.progress);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const list = useMemo(
    () => (episodes.data ?? []).filter((e) => (lang === "dub" ? e.dub : e.sub)),
    [episodes.data, lang],
  );

  if (anime.isLoading) {
    return (
      <div className="space-y-4 px-6 py-8 max-md:px-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-8 w-72" />
      </div>
    );
  }
  if (anime.isError || !anime.data) {
    return (
      <div className="px-6 py-8 max-md:px-4">
        <p className="font-medium">Anime introuvable.</p>
        <p className="mt-1 text-sm text-muted">
          {anime.error instanceof Error ? anime.error.message : "Réessaie dans un instant."}
        </p>
        <Button className="mt-4" onClick={() => void anime.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const data = anime.data;

  return (
    <div>
      <div className="relative h-56 overflow-hidden max-md:h-44">
        <img
          src={data.banner}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
      </div>

      <div className="-mt-24 flex gap-6 px-6 max-md:flex-col max-md:px-4">
        <CoverImage
          src={data.image}
          alt={data.title}
          seed={slug}
          className="relative aspect-[2/3] w-44 shrink-0 shadow-xl max-md:w-32"
        />
        <div className="min-w-0 self-end">
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {data.title}
          </h1>
          <p className="mt-3 line-clamp-5 max-w-2xl text-sm text-muted">{data.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant={hydrated && favorite ? "accent" : "outline"}
              onClick={() =>
                toggleFavorite({
                  slug,
                  title: data.title,
                  image: data.image,
                  banner: data.banner,
                })
              }
            >
              <Heart className={cn("size-4", hydrated && favorite && "fill-current")} />
              {hydrated && favorite ? "Dans les favoris" : "Ajouter aux favoris"}
            </Button>
            <LangToggle lang={lang} onChange={setLang} />
          </div>
        </div>
      </div>

      <div className="px-6 py-8 max-md:px-4">
        {seasons.length > 1 ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {seasons.map((s) => (
              <button
                key={s.base}
                type="button"
                onClick={() => void navigate({ search: { season: s.base }, replace: true })}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-[var(--motion-quick)]",
                  s.base === season?.base
                    ? "bg-fg text-bg"
                    : "bg-elevated text-muted hover:bg-hover hover:text-fg",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : null}

        {!seasons.length ? (
          <p className="text-sm text-muted">Aucun épisode publié pour le moment.</p>
        ) : null}
        {episodes.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : null}
        {episodes.data && !list.length ? (
          <p className="text-sm text-muted">
            Aucun épisode en {lang === "dub" ? "VF" : "VOSTFR"} pour cette saison.
          </p>
        ) : null}

        <ul className="divide-y divide-border/60">
          {list.map((ep) => {
            const p = hydrated ? progress[ep.id] : undefined;
            const done = p && p.duration > 0 && p.time >= p.duration * 0.95;
            return (
              <li key={ep.id}>
                <Link
                  to="/watch"
                  search={{ id: ep.id, lang }}
                  className="flex min-h-14 items-center gap-4 rounded-lg px-3 py-2 transition-colors duration-[var(--motion-quick)] hover:bg-hover"
                >
                  <span className="w-8 text-right text-sm tabular-nums text-subtle">
                    {ep.label}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{ep.title}</span>
                    {p && !done && p.duration > 0 ? (
                      <span className="mt-1.5 block h-1 w-full max-w-48 overflow-hidden rounded-full bg-elevated">
                        <span
                          className="block h-full bg-accent"
                          style={{ width: `${Math.min(100, (p.time / p.duration) * 100)}%` }}
                        />
                      </span>
                    ) : null}
                  </span>
                  {done ? <Check className="size-4 text-accent" aria-label="Vu" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
