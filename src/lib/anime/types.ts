export interface AnimeCard {
  slug: string;
  title: string;
  image: string;
  banner: string;
}

export interface Season {
  /** Chemin sans la langue, ex. "saison1", "film", "oav". */
  base: string;
  label: string;
  langs: string[];
}

export interface AnimeDetails extends AnimeCard {
  description: string;
  seasons: Season[];
}

export interface Episode {
  /** Identifiant stable : as:<slug>:<base>/<langue>:<index> */
  id: string;
  number: number;
  label: string;
  title: string;
  sub: boolean;
  dub: boolean;
}

export interface HomeSection {
  id: string;
  title: string;
  items: AnimeCard[];
}

export type Lang = "sub" | "dub";

export interface StreamSource {
  kind: "mp4" | "hls" | "iframe";
  /** mp4/hls : URL passant par le proxy du site ; iframe : page du lecteur d'origine. */
  url: string;
  host: string;
  lang: Lang;
}

export interface CataloguePage {
  items: AnimeCard[];
  page: number;
  hasMore: boolean;
}
