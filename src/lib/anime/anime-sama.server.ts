import { POPULAR } from "./popular";
import { parseEpisodeId } from "./format";
import type {
  AnimeCard,
  AnimeDetails,
  CataloguePage,
  Episode,
  HomeSection,
  Lang,
  Season,
  StreamSource,
} from "./types";

// Port serveur du module Anime-Sama v1.1.2 : scraping de anime-sama.to, pas d'API officielle.
const SITE = "https://anime-sama.to";
const ANILIST_URL = "https://graphql.anilist.co";
const SIBNET_HOST = "https://video.sibnet.ru";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
const PANEL_LANGS = ["vostfr", "vf", "vf1", "vf2"] as const;
const DUB_LANGS = ["vf", "vf1", "vf2"];

/* ───────────────────────────── cache + HTTP ───────────────────────────── */

const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function getText(url: string, referer = SITE + "/", timeoutMs = 10000) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/json,*/*",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: referer,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { status: res.status, text: res.status < 400 ? await res.text() : "" };
  } catch {
    return { status: 0, text: "" };
  }
}

/** Hôtes parqués 15 min après un 403/429 (comme le module d'origine). */
const parked = new Map<string, number>();

/* ───────────────────────────── helpers texte ───────────────────────────── */

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function absolute(value: string, base = SITE): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return "https:" + value;
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

const thumb = (slug: string) =>
  `https://cdn.jsdelivr.net/gh/Anime-Sama/IMG@img/contenu/thumb/${slug}.webp`;

/* ───────────────────────────── cartes catalogue ───────────────────────────── */

export function parseCards(html: string): AnimeCard[] {
  const out: AnimeCard[] = [];
  const seen = new Set<string>();
  const cardRe = /<a[^>]*href="([^"*]*catalogue\/[^"*]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html))) {
    const href = m[1];
    const inner = m[2] || "";
    // Le type décrit le support ; on ne garde que anime et film.
    const typeMatch = inner.match(
      /<div[^>]*class=["'][^"']*\btype-row\b[^"']*["'][^>]*>[\s\S]*?<p[^>]*class=["'][^"']*\binfo-value\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
    );
    const types = typeMatch
      ? cleanText(typeMatch[1])
          .split(",")
          .map((x) => x.trim().toLowerCase())
      : [];
    if (types.length && !types.some((x) => x === "anime" || x === "film")) continue;
    if (/\/scans?(?:\/|$)/i.test(href)) continue;

    const slug = (href.split("?")[0].match(/\/catalogue\/([^/?#]+)/i) || [])[1];
    if (!slug || seen.has(slug)) continue;

    const img = inner.match(/src="([^"*]+contenu[^"*]+)"/i) || inner.match(/src="([^"*]+)"/i);
    let banner = img ? img[1].trim() : "";
    if (banner.includes("flag_") || banner.includes("logo_icon")) banner = "";

    const alt =
      inner.match(/<h2[^>]*class="[^"]*\bcard-title\b[^"]*"[^>]*>([\s\S]*?)<\/h2>/i) ||
      inner.match(/alt="([^"*]+)"/i);
    let title = cleanText(alt?.[1]);
    if (!title || /^(vostfr|vf|va|var|vkr|vcn|vqc|vf1|vf2)$/i.test(title))
      title = titleFromSlug(slug);

    const pop = POPULAR.find((p) => p.slug === slug);
    const image = pop ? pop.image : banner || thumb(slug);
    seen.add(slug);
    out.push({
      slug,
      title,
      image: absolute(image),
      banner: absolute(pop ? pop.banner : banner || image),
    });
  }
  return out;
}

export async function getCataloguePage(page: number): Promise<CataloguePage> {
  const n = Math.max(1, Math.floor(page) || 1);
  return cached(`catalogue:${n}`, 5 * 60_000, async () => {
    const res = await getText(`${SITE}/catalogue/?page=${n}`);
    const next = new RegExp(`[?&]page=${n + 1}(?:[&"'\\s]|$)`);
    return { items: parseCards(res.text).slice(0, 50), page: n, hasMore: next.test(res.text) };
  });
}

export async function getHome(): Promise<HomeSection[]> {
  return cached("home", 5 * 60_000, async () => {
    const res = await getText(`${SITE}/`);
    const cards = parseCards(res.text).slice(0, 40);
    const classics = POPULAR.map((p) => ({
      slug: p.slug,
      title: p.title,
      image: p.image,
      banner: p.banner,
    }));
    const sections: HomeSection[] = [];
    if (cards.length) {
      sections.push({
        id: "trending",
        title: "Tendances (VOSTFR et VF)",
        items: cards.slice(0, 12),
      });
      if (cards.length > 12)
        sections.push({ id: "popular", title: "Animes en français", items: cards.slice(12) });
    }
    sections.push({ id: "classics", title: "Grands classiques", items: classics });
    return sections;
  });
}

/* ───────────────────────────── AniList (visuels + alias) ───────────────────────────── */

interface AniListInfo {
  cover: string;
  banner: string;
  slugs: string[];
}

async function queryAniList(query: string): Promise<AniListInfo | null> {
  try {
    const gql =
      "query($q:String){Media(search:$q,type:ANIME){title{english romaji}coverImage{extraLarge large}bannerImage}}";
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: gql, variables: { q: query } }),
      signal: AbortSignal.timeout(5000),
    });
    const media = (await res.json())?.data?.Media;
    if (!media) return null;
    const { romaji, english } = media.title ?? {};
    return {
      cover: media.coverImage?.extraLarge || media.coverImage?.large || "",
      banner: media.bannerImage || "",
      slugs: [
        slugify(query),
        romaji ? slugify(romaji) : "",
        english ? slugify(english) : "",
      ].filter(Boolean),
    };
  } catch {
    return null;
  }
}

/* ───────────────────────────── recherche ───────────────────────────── */

function normForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’'`´:;.!?&,+()[\]{}<>/\\|–—"]/g, " ")
    .replace(/\bs\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchAnime(query: string): Promise<AnimeCard[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  return cached(`search:${term.toLowerCase()}`, 5 * 60_000, async () => {
    const live = await getText(`${SITE}/catalogue/?search=${encodeURIComponent(term)}`);
    const liveCards = parseCards(live.text);
    if (liveCards.length) return liveCards;

    // Repli : catalogue populaire, puis slugs devinés via AniList.
    const q = normForMatch(term);
    const local = POPULAR.filter(
      (p) =>
        normForMatch(p.title).includes(q) || normForMatch(p.slug.replace(/-/g, " ")).includes(q),
    );
    if (local.length)
      return local.map((p) => ({ slug: p.slug, title: p.title, image: p.image, banner: p.banner }));

    const info = await queryAniList(term);
    for (const slug of info?.slugs ?? [slugify(term)]) {
      const page = await getText(`${SITE}/catalogue/${slug}/`, SITE + "/", 4000);
      if (page.status === 200) {
        const title =
          cleanText(page.text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) || titleFromSlug(slug);
        const image = info?.cover || thumb(slug);
        return [{ slug, title, image, banner: info?.banner || image }];
      }
    }
    return [];
  });
}

/* ───────────────────────────── fiche + saisons ───────────────────────────── */

interface Panel {
  label: string;
  path: string;
}

function parseSeasonPanels(html: string): Panel[] {
  const panels: Panel[] = [];
  const seen = new Set<string>();
  const source = html.replace(/<!--([\s\S]*?)-->|\/\*[\s\S]*?\*\//g, "");
  const re = /panneauAnime\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const path = m[2].replace(/^\/+|\/+$/g, "");
    if (!path || path === "url" || seen.has(path)) continue;
    seen.add(path);
    panels.push({ label: cleanText(m[1]), path });
  }
  return panels;
}

const LANG_SUFFIX = /\/(?:vostfr|vf[12]?)$/;

function seasonsFromPanels(panels: Panel[]): Season[] {
  const usable = panels.filter((p) => LANG_SUFFIX.test(p.path));
  const seasons: Season[] = [];
  for (const p of usable) {
    const base = p.path.replace(LANG_SUFFIX, "");
    const lang = p.path.slice(base.length + 1);
    const known = seasons.find((s) => s.base === base);
    if (known) known.langs.push(lang);
    else seasons.push({ base, label: p.label, langs: [lang] });
  }
  return seasons;
}

export async function getAnimeDetails(slug: string): Promise<AnimeDetails> {
  if (!/^[a-z0-9-]+$/i.test(slug)) throw new Error("Identifiant d'anime invalide");
  return cached(`anime:${slug}`, 10 * 60_000, async () => {
    const res = await getText(`${SITE}/catalogue/${slug}/`, SITE + "/", 15000);
    if (!res.text) throw new Error("Anime introuvable ou site indisponible");
    const html = res.text;
    const title = cleanText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) || titleFromSlug(slug);
    const synopsis =
      html.match(/id="synopsisText"[^>]*>([\s\S]*?)<\/(?:p|div)>/i) ||
      html.match(/class="synopsis-text"[^>]*>([\s\S]*?)<\/(?:p|div)>/i) ||
      html.match(/<div class="synopsis-content"[^>]*>([\s\S]*?)<\/div>/i);
    let description = cleanText(synopsis?.[1]);
    if (!description)
      description = cleanText(html.match(/property="og:description" content="([^"]+)"/i)?.[1]);

    const siteImage =
      (html.match(/https:\/\/cdn\.jsdelivr\.net\/gh\/Anime-Sama\/IMG@img\/contenu\/[^"' \s)]+/i) ||
        [])[0] || thumb(slug);
    const pop = POPULAR.find((p) => p.slug === slug);
    let image = pop?.image ?? "";
    let banner = pop?.banner ?? siteImage;
    if (!image) {
      const info = await queryAniList(title);
      image = info?.cover || siteImage;
      if (info?.banner) banner = info.banner;
    }
    return {
      slug,
      title,
      description: description || `Regarder ${title} en streaming VOSTFR et VF.`,
      image,
      banner,
      seasons: seasonsFromPanels(parseSeasonPanels(html)),
    };
  });
}

/* ───────────────────────────── épisodes ───────────────────────────── */

type EpsArrays = Record<string, string[]>;

function parseEpsArrays(js: string): EpsArrays {
  const out: EpsArrays = {};
  const re = /var\s+(eps[0-9]+)\s*=\s*\[([\s\S]*?)\];/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(js))) {
    const urls: string[] = [];
    const urlRe = /['"]([^'"]*)['"]/g;
    let u: RegExpExecArray | null;
    while ((u = urlRe.exec(m[2]))) urls.push(/^https?:\/\//i.test(u[1]) ? u[1] : "");
    if (urls.length) out[m[1].toLowerCase()] = urls;
  }
  return out;
}

const countOf = (arrays: EpsArrays) => Math.max(0, ...Object.values(arrays).map((a) => a.length));

function arraysFor(slug: string, panelPath: string): Promise<EpsArrays> {
  return cached(`eps:${slug}:${panelPath}`, 5 * 60_000, async () => {
    const root = `${SITE}/catalogue/${slug}/`;
    const res = await getText(`${root}${panelPath}/episodes.js`, root, 8000);
    return parseEpsArrays(res.text);
  });
}

/** Numéros d'épisode affichés par la page (creerListe / newSP / finirListe). */
function sourceEpisodeLabels(html: string, count: number): string[] {
  const source = html.replace(/\/\*[\s\S]*?\*\//g, "");
  const labels: string[] = [];
  const calls =
    /creerListe\(\s*(\d+)\s*,\s*(\d+)\s*\)|newSPF?\(\s*['"]([^'"]+)['"]\s*\)|finirListe\(\s*(\d+)\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = calls.exec(source)) && labels.length < count) {
    if (m[1])
      for (let n = Number(m[1]); n <= Number(m[2]) && labels.length < count; n++)
        labels.push(String(n));
    else if (m[3]) labels.push(m[3]);
    else if (m[4]) for (let n = Number(m[4]); labels.length < count; n++) labels.push(String(n));
  }
  return labels;
}

function labelsFor(slug: string, panelPath: string, count: number): Promise<string[]> {
  return cached(`labels:${slug}:${panelPath}:${count}`, 5 * 60_000, async () => {
    const root = `${SITE}/catalogue/${slug}/`;
    const page = await getText(`${root}${panelPath}/`, root, 8000);
    const labels = sourceEpisodeLabels(page.text, count);
    while (labels.length < count) labels.push(String(labels.length + 1));
    return labels;
  });
}

export async function getEpisodes(slug: string, base: string): Promise<Episode[]> {
  if (!/^[a-z0-9-]+$/i.test(slug) || !/^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/i.test(base)) return [];
  return cached(`episodes:${slug}:${base}`, 5 * 60_000, async () => {
    const byLang: Record<string, EpsArrays> = {};
    await Promise.all(
      PANEL_LANGS.map(async (l) => {
        byLang[l] = await arraysFor(slug, `${base}/${l}`);
      }),
    );
    const sizes = Object.fromEntries(PANEL_LANGS.map((l) => [l, countOf(byLang[l])]));
    const count = Math.max(...Object.values(sizes));
    if (!count) return [];
    const primary = sizes.vostfr ? "vostfr" : DUB_LANGS.find((l) => sizes[l]) || "vostfr";
    const labelsByLang: Record<string, string[]> = {};
    await Promise.all(
      PANEL_LANGS.map(async (l) => {
        labelsByLang[l] = sizes[l] ? await labelsFor(slug, `${base}/${l}`, sizes[l]) : [];
      }),
    );
    const labels = labelsByLang[primary];
    const has = (l: string, desired: string) => {
      const slot = labelsByLang[l].indexOf(desired);
      return slot >= 0 && Object.values(byLang[l]).some((arr) => !!arr[slot]);
    };
    const episodes: Episode[] = [];
    for (let ep = 1; ep <= count; ep++) {
      const desired = labels[ep - 1] || String(ep);
      const sub = has("vostfr", desired);
      const dubLang = DUB_LANGS.find((l) => has(l, desired));
      if (!sub && !dubLang) continue;
      const lang = sub ? "vostfr" : (dubLang as string);
      const index = labelsByLang[lang].indexOf(desired) + 1;
      const numeric = Number(desired);
      episodes.push({
        id: `as:${slug}:${base}/${lang}:${index}`,
        number: Number.isInteger(numeric) && numeric > 0 ? numeric : ep,
        label: desired,
        title: `Épisode ${desired}`,
        sub,
        dub: !!dubLang,
      });
    }
    return episodes;
  });
}

/* ───────────────────────────── flux vidéo ───────────────────────────── */

interface Route {
  kind: "mp4" | "hls";
  url: string;
  referer: string;
  host: string;
}

export const proxied = (url: string, referer: string) =>
  `/api/proxy?u=${encodeURIComponent(url)}&r=${encodeURIComponent(referer)}`;

async function fetchLimited(url: string, headers: Record<string, string>, opts: RequestInit = {}) {
  const host = new URL(url).host;
  if ((parked.get(host) ?? 0) > Date.now()) return null;
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { "User-Agent": USER_AGENT, ...headers },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 403 || res.status === 429) {
      parked.set(host, Date.now() + 15 * 60_000);
      return null;
    }
    return res;
  } catch {
    return null;
  }
}

function parseSibnetSource(html: string): string | null {
  const m =
    html.match(/player\.src\(\[\{src:\s*"([^"]+\.mp4[^"]*)"/i) ||
    html.match(/"file"\s*:\s*"([^"]+\.mp4[^"]*)"/i);
  return m ? absolute(m[1], SIBNET_HOST) : null;
}

async function resolveSibnet(embedUrl: string): Promise<Route> {
  const page = await getText(embedUrl, SITE + "/", 10000);
  const raw = parseSibnetSource(page.text);
  if (!raw) throw new Error("Lien MP4 Sibnet introuvable");
  // Sibnet refuse HEAD : GET Range sans suivre la redirection pour lire l'URL du stockage.
  let finalUrl = raw;
  const probe = await fetchLimited(
    raw,
    { Referer: embedUrl, Range: "bytes=0-1" },
    { redirect: "manual" },
  );
  const loc = probe?.headers.get("location");
  if (loc) finalUrl = absolute(loc, raw);
  return { kind: "mp4", url: finalUrl, referer: embedUrl, host: "Sibnet" };
}

async function resolveHls(embedUrl: string): Promise<Route> {
  const page = await getText(embedUrl, SITE + "/", 10000);
  const m =
    page.text.match(/sources:\s*\[\s*\{[^}]*file:\s*["']([^"']+)["']/i) ||
    page.text.match(/file:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
  if (!m) throw new Error("Lien HLS introuvable");
  return { kind: "hls", url: m[1], referer: embedUrl, host: new URL(embedUrl).host };
}

/** Vérifie qu'une route renvoie vraiment de la vidéo (MIME video/*, ftyp ou #EXTM3U). */
async function verify(route: Route): Promise<boolean> {
  const headers = { Referer: route.referer, Origin: new URL(route.referer).origin };
  if (route.kind === "mp4") {
    const res = await fetchLimited(route.url, { ...headers, Range: "bytes=0-1023" });
    if (!res || !(res.status === 200 || res.status === 206)) return false;
    const type = res.headers.get("content-type") || "";
    const head = new TextDecoder("latin1").decode((await res.arrayBuffer()).slice(0, 32));
    return /video\/|application\/octet-stream/i.test(type) || /ftyp/.test(head);
  }
  const res = await fetchLimited(route.url, headers);
  if (!res || res.status !== 200) return false;
  return /^\s*#EXTM3U/.test(await res.text());
}

const hostRank = (host: string) =>
  host.includes("sibnet.ru") ? 0 : host.includes("sendvid") ? 1 : host.includes("ansembed") ? 2 : 3;

function parseSendvidSource(html: string): string | null {
  const m =
    html.match(/<source[^>]+src=["']([^"']+\.mp4[^"']*)["']/i) ||
    html.match(/property=["']og:video(?::url)?["'][^>]*content=["']([^"']+\.mp4[^"']*)["']/i) ||
    html.match(/content=["']([^"']+\.mp4[^"']*)["'][^>]*property=["']og:video/i);
  return m ? absolute(m[1].replace(/&amp;/g, "&"), "https://sendvid.com") : null;
}

/** null = vidéo supprimée (page 404), à ne pas proposer. */
async function resolveSendvid(embedUrl: string): Promise<Route | null> {
  const page = await getText(embedUrl, SITE + "/", 10000);
  if (page.status === 404) return null;
  const raw = parseSendvidSource(page.text);
  if (!raw) throw new Error("Lien MP4 Sendvid introuvable");
  return { kind: "mp4", url: raw, referer: embedUrl, host: "Sendvid" };
}

const hostLabel = (host: string) =>
  host.includes("sibnet") ? "Sibnet" : host.includes("embed4me") ? "Embed4me" : host;

/** Résout un lecteur : flux direct vérifié, sinon iframe du lecteur d'origine, ou null s'il est mort. */
async function resolveCandidate(c: {
  url: string;
  host: string;
  lang: string;
}): Promise<{ route: Route | null; embed: boolean } | null> {
  try {
    let route: Route | null = null;
    if (c.host.includes("sibnet.ru")) route = await resolveSibnet(c.url);
    else if (c.host.includes("sendvid")) {
      route = await resolveSendvid(c.url);
      if (!route) return null;
    } else if (/ansembed|vidmoly|vidspeed/.test(c.host)) route = await resolveHls(c.url);
    if (route && (await verify(route))) return { route, embed: false };
  } catch {
    // Repli sur l'iframe ci-dessous.
  }
  return { route: null, embed: true };
}

/** Tous les lecteurs d'un épisode : flux directs vérifiés d'abord, puis lecteurs intégrés (iframe). */
export async function resolveStreams(id: string, lang: Lang): Promise<StreamSource[]> {
  const parsed = parseEpisodeId(id);
  if (!parsed || parsed.index < 1) return [];
  const { slug, base, lang: sourceLang, index } = parsed;

  const sourceArrays = await arraysFor(slug, `${base}/${sourceLang}`);
  if (!Object.values(sourceArrays).some((a) => a[index - 1])) return [];
  const sourceLabels = await labelsFor(slug, `${base}/${sourceLang}`, countOf(sourceArrays));
  const desired = sourceLabels[index - 1];

  const wanted = lang === "dub" ? DUB_LANGS : ["vostfr"];
  const candidates: { url: string; host: string; lang: string }[] = [];
  for (const l of wanted) {
    const arrays = await arraysFor(slug, `${base}/${l}`);
    const labels = await labelsFor(slug, `${base}/${l}`, countOf(arrays));
    const at = l === sourceLang ? index - 1 : labels.indexOf(desired);
    if (at < 0 || (l !== sourceLang && labels.lastIndexOf(desired) !== at)) continue;
    const row = Object.values(arrays)
      .map((a) => a[at])
      .filter(Boolean)
      .map((url) => ({
        url,
        host: (url.match(/^https?:\/\/([^/]+)/i)?.[1] ?? "").toLowerCase(),
        lang: l,
      }))
      .sort((a, b) => hostRank(a.host) - hostRank(b.host));
    candidates.push(...row);
  }

  const resolved = await Promise.all(candidates.map((c) => resolveCandidate(c)));
  const direct: StreamSource[] = [];
  const embeds: StreamSource[] = [];
  const seen = new Set<string>();
  resolved.forEach((r, i) => {
    const c = candidates[i];
    if (!r || seen.has(c.url)) return;
    seen.add(c.url);
    if (r.route) {
      direct.push({
        kind: r.route.kind,
        url: proxied(r.route.url, r.route.referer),
        host: `${r.route.host} ${c.lang.toUpperCase()}`,
        lang,
      });
    } else if (/^https:\/\//i.test(c.url)) {
      embeds.push({
        kind: "iframe",
        url: c.url,
        host: `${hostLabel(c.host)} ${c.lang.toUpperCase()}`,
        lang,
      });
    }
  });
  return [...direct, ...embeds];
}
