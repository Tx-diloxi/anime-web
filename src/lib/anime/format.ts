export function formatTime(seconds?: number): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function greetingForHour(hour: number): string {
  if (hour < 6) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

export function hashHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

export interface ParsedEpisodeId {
  slug: string;
  base: string;
  lang: string;
  index: number;
}

export function parseEpisodeId(id: string): ParsedEpisodeId | null {
  const m = /^as:([a-z0-9-]+):([a-z0-9_-]+(?:\/[a-z0-9_-]+)*)\/(vostfr|vf[12]?):(\d+)$/i.exec(id);
  return m ? { slug: m[1], base: m[2], lang: m[3], index: Number(m[4]) } : null;
}
