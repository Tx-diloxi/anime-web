import { AnimeCard } from "@/components/anime-card";
import type { HomeSection } from "@/lib/anime/types";

export function SectionRow({ section }: { section: HomeSection }) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 font-display text-xl font-semibold tracking-tight text-balance">
        {section.title}
      </h2>
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {section.items.map((anime) => (
          <AnimeCard key={`${section.id}-${anime.slug}`} anime={anime} />
        ))}
      </div>
    </section>
  );
}
