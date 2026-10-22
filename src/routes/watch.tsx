import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LangToggle } from "@/components/lang-toggle";
import { VideoPlayer } from "@/components/video-player";
import { fetchAnime, fetchEpisodes, fetchStreams } from "@/lib/anime/functions";
import { parseEpisodeId } from "@/lib/anime/format";
import { useLibraryStore } from "@/lib/anime/library-store";
import type { Lang } from "@/lib/anime/types";

export const Route = createFileRoute("/watch")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
    lang: (search.lang === "dub" ? "dub" : "sub") as Lang,
  }),
  component: WatchPage,
});

function WatchPage() {
  const { id, lang } = Route.useSearch();
  const navigate = useNavigate();
  const parsed = useMemo(() => parseEpisodeId(id), [id]);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pick, setPick] = useState(0);

  const anime = useQuery({
    queryKey: ["anime", parsed?.slug],
    queryFn: () => fetchAnime({ data: { slug: parsed!.slug } }),
    enabled: Boolean(parsed),
  });
  const episodes = useQuery({
    queryKey: ["episodes", parsed?.slug, parsed?.base],
    queryFn: () => fetchEpisodes({ data: { slug: parsed!.slug, base: parsed!.base } }),
    enabled: Boolean(parsed),
  });
  const streams = useQuery({
    queryKey: ["streams", id, lang, attempt],
    queryFn: () => fetchStreams({ data: { id, lang } }),
    enabled: Boolean(parsed),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const sources = streams.data ?? [];
  const active = sources[pick];

  useEffect(() => {
    setPick(0);
    setPlayerError(null);
  }, [id, lang, attempt]);

  const saveProgress = useLibraryStore((s) => s.saveProgress);
  const saved = useLibraryStore((s) => s.progress[id]);
  const setLang = useLibraryStore((s) => s.setLang);

  const list = useMemo(
    () => (episodes.data ?? []).filter((e) => (lang === "dub" ? e.dub : e.sub)),
    [episodes.data, lang],
  );
  const position = list.findIndex((e) => e.id === id);
  const current = position >= 0 ? list[position] : episodes.data?.find((e) => e.id === id);
  const prev = position > 0 ? list[position - 1] : undefined;
  const next = position >= 0 ? list[position + 1] : undefined;

  const goTo = (episodeId: string) =>
    void navigate({ to: "/watch", search: { id: episodeId, lang } });

  if (!parsed) {
    return (
      <div className="px-6 py-8 max-md:px-4">
        <p className="font-medium">Épisode invalide.</p>
        <Button asChild className="mt-4">
          <Link to="/">Retour à l’accueil</Link>
        </Button>
      </div>
    );
  }

  const title = anime.data?.title ?? "Chargement…";
  const label = current?.label ?? String(parsed.index);

  return (
    <div className="px-6 py-6 max-md:px-0 max-md:py-0">
      <div className="mx-auto max-w-5xl">
        {streams.isLoading ? (
          <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-black max-md:rounded-none">
            <p className="text-sm text-muted">Recherche d’une source vidéo…</p>
          </div>
        ) : null}

        {active && !playerError ? (
          <VideoPlayer
            key={active.url}
            source={active}
            startAt={saved?.time ?? 0}
            onProgress={(time, duration) => {
              if (!Number.isFinite(duration) || duration <= 0) return;
              saveProgress({
                episodeId: id,
                slug: parsed.slug,
                animeTitle: title,
                image: anime.data?.image ?? "",
                label,
                lang,
                time,
                duration,
                updatedAt: Date.now(),
              });
            }}
            onEnded={() => {
              if (next) goTo(next.id);
            }}
            onError={(message) => {
              // Un lecteur en échec : on bascule sur le suivant avant d'abandonner.
              if (pick < sources.length - 1) setPick(pick + 1);
              else setPlayerError(message);
            }}
          />
        ) : null}

        {streams.isError || (streams.isSuccess && !sources.length) || playerError ? (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-elevated px-6 text-center max-md:rounded-none">
            <TriangleAlert className="size-8 text-accent" />
            <p className="font-medium">Aucune source ne répond pour cet épisode.</p>
            <p className="max-w-md text-sm text-muted">
              {playerError ??
                "Les lecteurs d’Anime-Sama sont indisponibles ou ont changé. Réessaie, ou essaie l’autre langue."}
            </p>
            <Button
              variant="subtle"
              onClick={() => {
                setPlayerError(null);
                setAttempt((n) => n + 1);
              }}
            >
              Réessayer
            </Button>
          </div>
        ) : null}

        <div className="px-4 py-5 md:px-0">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            {active?.host ?? " "}
          </p>
          {sources.length > 1 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {sources.map((src, i) => (
                <Button
                  key={src.url}
                  variant={i === pick ? "accent" : "subtle"}
                  onClick={() => {
                    setPlayerError(null);
                    setPick(i);
                  }}
                >
                  {src.host}
                  {src.kind === "iframe" ? " (intégré)" : ""}
                </Button>
              ))}
            </div>
          ) : null}
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            <Link
              to="/anime/$slug"
              params={{ slug: parsed.slug }}
              search={{ season: "" }}
              className="hover:text-accent"
            >
              {title}
            </Link>
          </h1>
          <p className="mt-1 text-sm text-muted">Épisode {label}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="subtle" disabled={!prev} onClick={() => prev && goTo(prev.id)}>
              <ChevronLeft className="size-4" />
              Précédent
            </Button>
            <Button variant="accent" disabled={!next} onClick={() => next && goTo(next.id)}>
              Suivant
              <ChevronRight className="size-4" />
            </Button>
            <LangToggle
              lang={lang}
              onChange={(l) => {
                setLang(l);
                setPlayerError(null);
                void navigate({ to: "/watch", search: { id, lang: l } });
              }}
            />
          </div>
        </div>

        {episodes.isLoading ? <Skeleton className="mx-4 h-40 rounded-xl md:mx-0" /> : null}
        {list.length > 1 ? (
          <div className="px-4 pb-8 md:px-0">
            <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Épisodes</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-2">
              {list.map((ep) => (
                <Link
                  key={ep.id}
                  to="/watch"
                  search={{ id: ep.id, lang }}
                  aria-current={ep.id === id ? "true" : undefined}
                  className={
                    ep.id === id
                      ? "flex h-11 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-fg"
                      : "flex h-11 items-center justify-center rounded-lg bg-elevated text-sm text-muted hover:bg-hover hover:text-fg"
                  }
                >
                  {ep.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
