import { createServerFn } from "@tanstack/react-start";
import type { Lang } from "./types";

export const fetchHome = createServerFn({ method: "GET" }).handler(async () => {
  const { getHome } = await import("./anime-sama.server");
  return getHome();
});

export const fetchCatalogue = createServerFn({ method: "GET" })
  .validator((data: { page: number }) => data)
  .handler(async ({ data }) => {
    const { getCataloguePage } = await import("./anime-sama.server");
    return getCataloguePage(data.page);
  });

export const fetchSearch = createServerFn({ method: "GET" })
  .validator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    const { searchAnime } = await import("./anime-sama.server");
    return searchAnime(data.query);
  });

export const fetchAnime = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { getAnimeDetails } = await import("./anime-sama.server");
    return getAnimeDetails(data.slug);
  });

export const fetchEpisodes = createServerFn({ method: "GET" })
  .validator((data: { slug: string; base: string }) => data)
  .handler(async ({ data }) => {
    const { getEpisodes } = await import("./anime-sama.server");
    return getEpisodes(data.slug, data.base);
  });

export const fetchStreams = createServerFn({ method: "GET" })
  .validator((data: { id: string; lang: Lang }) => data)
  .handler(async ({ data }) => {
    const { resolveStreams } = await import("./anime-sama.server");
    return resolveStreams(data.id, data.lang);
  });
