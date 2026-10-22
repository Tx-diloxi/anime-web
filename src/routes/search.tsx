import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { AnimeCard } from "@/components/anime-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCatalogue, fetchSearch } from "@/lib/anime/functions";
import { useDebounced } from "@/lib/use-debounced";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: SearchPage,
});

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1";

function SearchPage() {
  const { q: initial } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState(initial);
  const debounced = useDebounced(query, 350);
  const searching = debounced.trim().length > 1;

  const results = useQuery({
    queryKey: ["search", debounced.trim()],
    queryFn: () => fetchSearch({ data: { query: debounced } }),
    enabled: searching,
  });

  const catalogue = useInfiniteQuery({
    queryKey: ["catalogue"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchCatalogue({ data: { page: pageParam } }),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: !searching,
  });

  return (
    <div className="px-6 py-8 max-md:px-4">
      <div className="relative max-w-xl">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle" />
        <Input
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            void navigate({ search: { q: next }, replace: true });
          }}
          placeholder="Titre d’anime…"
          className="pl-11"
          autoFocus
        />
      </div>

      {searching ? (
        <div className="mt-8">
          {results.isFetching ? <GridSkeleton /> : null}
          {results.isError ? (
            <p className="text-sm text-muted">La recherche a échoué. Réessaie dans un instant.</p>
          ) : null}
          {results.data && !results.isFetching ? (
            results.data.length ? (
              <div className={GRID}>
                {results.data.map((anime) => (
                  <AnimeCard key={anime.slug} anime={anime} fluid />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Aucun anime trouvé pour « {debounced.trim()} ».</p>
            )
          ) : null}
        </div>
      ) : (
        <div className="mt-8">
          <h2 className="mb-3 px-1 font-display text-xl font-semibold tracking-tight">Catalogue</h2>
          {catalogue.isLoading ? <GridSkeleton /> : null}
          {catalogue.isError ? (
            <p className="text-sm text-muted">Impossible de charger le catalogue.</p>
          ) : null}
          <div className={GRID}>
            {catalogue.data?.pages
              .flatMap((p) => p.items)
              .map((anime) => (
                <AnimeCard key={anime.slug} anime={anime} fluid />
              ))}
          </div>
          {catalogue.hasNextPage ? (
            <Button
              variant="subtle"
              className="mt-6"
              disabled={catalogue.isFetchingNextPage}
              onClick={() => void catalogue.fetchNextPage()}
            >
              {catalogue.isFetchingNextPage ? "Chargement…" : "Voir plus"}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-xl" />
      ))}
    </div>
  );
}
