import { useEffect, useRef } from "react";
import type { StreamSource } from "@/lib/anime/types";

export function VideoPlayer({
  source,
  startAt,
  onProgress,
  onEnded,
  onError,
}: {
  source: StreamSource;
  startAt: number;
  onProgress: (time: number, duration: number) => void;
  onEnded: () => void;
  onError: (message: string) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onProgress, onEnded, onError });
  callbacks.current = { onProgress, onEnded, onError };

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    let lastSaved = 0;

    const resume = () => {
      if (startAt > 5 && Number.isFinite(video.duration) && startAt < video.duration * 0.95) {
        video.currentTime = startAt;
      }
    };
    const onTime = () => {
      const now = Date.now();
      if (now - lastSaved < 5000) return;
      lastSaved = now;
      callbacks.current.onProgress(video.currentTime, video.duration);
    };
    const onPause = () => callbacks.current.onProgress(video.currentTime, video.duration);
    const finished = () => callbacks.current.onEnded();
    const failed = () => callbacks.current.onError("La lecture a échoué sur cette source.");

    video.addEventListener("loadedmetadata", resume, { once: true });
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", finished);
    video.addEventListener("error", failed);

    if (source.kind === "iframe") return;

    if (source.kind === "hls" &&!video.canPlayType("application/vnd.apple.mpegurl")) {
      void import("hls.js").then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) {
          failed();
          return;
        }
        const instance = new Hls();
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) failed();
        });
        instance.loadSource(source.url);
        instance.attachMedia(video);
        hls = instance;
      });
    } else {
      video.src = source.url;
    }

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", resume);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", finished);
      video.removeEventListener("error", failed);
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    // startAt n'est lu qu'au chargement de la source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.url, source.kind]);

  if (source.kind === "iframe") {
    return (
      <iframe
        src={source.url}
        title={source.host}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-xl bg-black max-md:rounded-none"
      />
    );
  }

  return (
    <video
      ref={ref}
      controls
      autoPlay
      playsInline
      className="aspect-video w-full rounded-xl bg-black"
    />
  );
}
