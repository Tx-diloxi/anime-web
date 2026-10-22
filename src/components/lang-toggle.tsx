import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/anime/types";

export function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="inline-flex rounded-full bg-elevated p-1" role="group" aria-label="Langue">
      {(["sub", "dub"] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={lang === value}
          onClick={() => onChange(value)}
          className={cn(
            "h-9 rounded-full px-4 text-xs font-semibold transition-colors duration-[var(--motion-quick)]",
            lang === value ? "bg-fg text-bg" : "text-muted hover:text-fg",
          )}
        >
          {value === "sub" ? "VOSTFR" : "VF"}
        </button>
      ))}
    </div>
  );
}
