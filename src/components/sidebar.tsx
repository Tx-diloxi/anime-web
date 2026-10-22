import { Heart, Home, Library, Search, type LucideIcon } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useLibraryStore } from "@/lib/anime/library-store";
import { cn } from "@/lib/utils";

const NAV: { to: "/" | "/search" | "/library"; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/search", label: "Recherche", icon: Search },
  { to: "/library", label: "Bibliothèque", icon: Library },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const favoriteCount = useLibraryStore((s) => Object.keys(s.favorites).length);

  return (
    <aside className="hidden w-[240px] shrink-0 flex-col gap-2 md:flex">
      <div className="rounded-xl bg-surface p-3">
        <Link to="/" className="mb-3 flex items-center gap-2.5 px-2 py-1">
          <span className="logo-mark" aria-hidden="true" />
          <span className="font-display text-lg font-semibold tracking-tight">animeWeb</span>
        </Link>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition-colors duration-[var(--motion-quick)] hover:text-fg",
                pathname === to && "bg-hover text-fg",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="rounded-xl bg-surface p-3">
        <Link
          to="/library"
          className="flex h-11 items-center gap-3 rounded-lg px-2 text-sm hover:bg-hover"
        >
          <span className="flex size-8 items-center justify-center rounded-sm bg-accent/20 text-accent">
            <Heart className="size-3.5 fill-current" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">Favoris</span>
            <span className="block text-xs text-subtle">{favoriteCount} animes</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="grid grid-cols-3 border-t border-border bg-bg/95 px-1 py-1 backdrop-blur-sm md:hidden">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className={cn(
            "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-subtle",
            pathname === to && "text-fg",
          )}
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
