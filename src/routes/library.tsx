import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { AnimeCard } from "@/components/anime-card";
import { Button } from "@/components/ui/button";
import { continueWatching, useLibraryStore } from "@/lib/anime/library-store";

export const Route = createFileRoute("/library")({ component: LibraryPage });

function LibraryPage() {
  const favorites = useLibraryStore((s) => s.favorites);
  const progress = useLibraryStore((s) => s.progress);
  const clearProgress = useLibraryStore((s) => s.clearProgress);
  // Le contenu vient de localStorage : on attend l'hydratation pour ne pas diverger du rendu serveur.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const favoriteList = useMemo(() => Object.values(favorites).reverse(), [favorites]);
  const resume = useMemo(() => continueWatching(progress), [progress]);
  const history = useMemo(
    () =>
      Object.values(progress)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 30),
    [progress],
  );

  if (!hydrated) return <div className="px-6 py-8 max-md:px-4" />;

  return (
    <div className="space-y-10 px-6 py-8 max-md:px-4">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Bibliothèque</h1>

      <section className="space-y-3">
        <h2 className="px-1 font-display text-xl font-semibold tracking-tight">Favoris</h2>
        {favoriteList.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1">
            {favoriteList.map((anime) => (
              <AnimeCard key={anime.slug} anime={anime} fluid />
            ))}
          </div>
        ) : (
          <p className="px-1 text-sm text-muted">
            Aucun favori. Ouvre la fiche d’un anime pour l’ajouter.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="px-1 font-display text-xl font-semibold tracking-tight">
          Reprendre la lecture
        </h2>
        {resume.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1">
            {resume.map((p) => (
              <AnimeCard
                key={p.episodeId}
                anime={{ slug: p.slug, title: p.animeTitle, image: p.image, banner: p.image }}
                watch={{ id: p.episodeId, lang: p.lang }}
                caption={`Épisode ${p.label}`}
                progress={p.time / p.duration}
                fluid
              />
            ))}
          </div>
        ) : (
          <p className="px-1 text-sm text-muted">Rien à reprendre pour le moment.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="px-1 font-display text-xl font-semibold tracking-tight">Historique</h2>
        {history.length ? (
          <ul className="divide-y divide-border/60">
            {history.map((p) => (
              <li key={p.episodeId} className="flex items-center gap-2">
                <Link
                  to="/watch"
                  search={{ id: p.episodeId, lang: p.lang }}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-4 rounded-lg px-3 py-2 hover:bg-hover"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.animeTitle}</span>
                    <span className="block text-xs text-muted">
                      Épisode {p.label} · {p.lang === "dub" ? "VF" : "VOSTFR"}
                    </span>
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted"
                  aria-label={`Retirer l’épisode ${p.label} de l’historique`}
                  onClick={() => clearProgress(p.episodeId)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-1 text-sm text-muted">Ton historique est vide.</p>
        )}
      </section>
    </div>
  );
}
