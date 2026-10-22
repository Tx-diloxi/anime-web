import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnimeCard, Lang } from "./types";

export interface WatchProgress {
  episodeId: string;
  slug: string;
  animeTitle: string;
  image: string;
  label: string;
  lang: Lang;
  time: number;
  duration: number;
  updatedAt: number;
}

type LibraryState = {
  favorites: Record<string, AnimeCard>;
  progress: Record<string, WatchProgress>;
  lang: Lang;
  toggleFavorite: (card: AnimeCard) => void;
  isFavorite: (slug: string) => boolean;
  saveProgress: (entry: WatchProgress) => void;
  clearProgress: (episodeId: string) => void;
  setLang: (lang: Lang) => void;
};

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: {},
      progress: {},
      lang: "sub",

      toggleFavorite: (card) => {
        const favorites = { ...get().favorites };
        if (favorites[card.slug]) delete favorites[card.slug];
        else favorites[card.slug] = card;
        set({ favorites });
      },
      isFavorite: (slug) => Boolean(get().favorites[slug]),

      saveProgress: (entry) => {
        const progress = { ...get().progress, [entry.episodeId]: entry };
        // On garde les 200 entrées les plus récentes.
        const keys = Object.keys(progress);
        if (keys.length > 200) {
          keys
            .sort((a, b) => progress[a].updatedAt - progress[b].updatedAt)
            .slice(0, keys.length - 200)
            .forEach((k) => delete progress[k]);
        }
        set({ progress });
      },
      clearProgress: (episodeId) => {
        const progress = { ...get().progress };
        delete progress[episodeId];
        set({ progress });
      },
      setLang: (lang) => set({ lang }),
    }),
    { name: "animeweb.library.v1", skipHydration: true },
  ),
);

/** Un seul épisode « à reprendre » par anime : le plus récent, non terminé. */
export function continueWatching(progress: Record<string, WatchProgress>): WatchProgress[] {
  const latest = new Map<string, WatchProgress>();
  for (const p of Object.values(progress)) {
    const known = latest.get(p.slug);
    if (!known || p.updatedAt > known.updatedAt) latest.set(p.slug, p);
  }
  return [...latest.values()]
    .filter((p) => p.duration > 0 && p.time > 10 && p.time < p.duration * 0.95)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
