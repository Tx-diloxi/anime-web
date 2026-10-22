import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { hashHue } from "@/lib/anime/format";

export function CoverImage({
  src,
  alt,
  className,
  seed,
}: {
  src?: string;
  alt: string;
  className?: string;
  seed?: string;
}) {
  const [failed, setFailed] = useState(false);
  const hue = useMemo(() => hashHue(seed || alt || "anime"), [seed, alt]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-elevated outline outline-1 -outline-offset-1 outline-fg/10",
        className,
      )}
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 22% 24%), hsl(${(hue + 40) % 360} 14% 12%))`,
      }}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
