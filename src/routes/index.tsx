import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SectionRow } from "@/components/section-row";
import { AnimeCard } from "@/components/anime-card";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fetchHome } from "@/lib/anime/functions";
import { greetingForHour } from "@/lib/anime/format";
import { continueWatching, useLibraryStore } from "@/lib/anime/library-store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  // L'heure n'est lue qu'après l'hydratation pour éviter un écart serveur/client.
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);
  const greeting = useMemo(() => (hour == null ? "" : greetingForHour(hour)), [hour]);

  const home = useQuery({ queryKey: ["home"], queryFn: () => fetchHome() });
  const progress = useLibraryStore((s) => s.progress);
  const resume = useMemo(() => continueWatching(progress).slice(0, 12), [progress]);

  return (
    <div className="stagger-in px-6 py-8 max-md:px-4">
      <p className="h-5 text-sm font-medium tracking-wide text-muted uppercase">{greeting}</p>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight md:text-5xl">
        Qu’est-ce qu’on regarde ?
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Animes en VOSTFR et VF. La lecture reprend là où tu t’es arrêté.
      </p>

      {resume.length ? (
        <section className="mt-8 space-y-3">
          <h2 className="px-1 font-display text-xl font-semibold tracking-tight">
            Reprendre la lecture
          </h2>
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {resume.map((p) => (
              <AnimeCard
                key={p.episodeId}
                anime={{ slug: p.slug, title: p.animeTitle, image: p.image, banner: p.image }}
                watch={{ id: p.episodeId, lang: p.lang }}
                caption={`Épisode ${p.label}`}
                progress={p.time / p.duration}
              />
            ))}
          </div>
        </section>
      ) : null}

      {home.isLoading ? <HomeSkeleton /> : null}

      {home.isError ? (
        <div className="mt-10 rounded-xl bg-elevated px-5 py-6">
          <p className="font-medium">Impossible de charger le catalogue.</p>
          <p className="mt-1 text-sm text-muted">
            {home.error instanceof Error ? home.error.message : "Réessaie dans un instant."}
          </p>
          <Button className="mt-4" onClick={() => void home.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : null}

      <div className="mt-8 space-y-8">
        {home.data?.map((section) => (
          <SectionRow key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="mt-8 space-y-8">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-7 w-48" />
          <div className="flex gap-3">
            {Array.from({ length: 6 }).map((__, j) => (
              <Skeleton key={j} className="h-64 w-40 shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
