/** A link shown on the show home page or an episode page. */
export interface Link {
  title: string;
  url: string;
}

/** A person credited on a show or an episode (podcast:person). */
export interface Person {
  name: string;
  /** Podcasting 2.0 role, for example "host", "guest", "producer". */
  role: string;
  href?: string;
  img?: string;
}

export interface Chapter {
  /** Start time in seconds. */
  start: number;
  title: string;
  url?: string;
  img?: string;
}

export interface Transcript {
  /** Absolute path of the source file inside the show folder. */
  sourcePath: string;
  /** File name used in the output folder for the episode. */
  fileName: string;
  /** MIME type, for example "text/vtt". */
  type: string;
  language?: string;
}

export interface Category {
  name: string;
  sub?: string;
}

export interface Owner {
  name: string;
  email: string;
}

export type ShowType = "episodic" | "serial";
export type EpisodeType = "full" | "trailer" | "bonus";

export interface Show {
  /** Absolute path of the show folder. */
  dir: string;
  title: string;
  author: string;
  description: string;
  language: string;
  /** Artwork path relative to the show folder, or an absolute URL. */
  artwork: string;
  categories: Category[];
  explicit: boolean;
  type: ShowType;
  /** podcast:medium value, for example "podcast" or "video". */
  medium: string;
  owner?: Owner;
  /** podcast:locked: whether other platforms may import the feed. Omitted when unset. */
  locked?: boolean;
  copyright?: string;
  /** Pinned podcast:guid. When absent it is derived from the feed URL. */
  guid?: string;
  baseUrl?: string;
  /** Theme folder, absolute path, when the show overrides the default. */
  themeDir?: string;
  hosts: Person[];
  links: Link[];
  episodes: Episode[];
}

export interface Episode {
  /** Absolute path of the Markdown source. */
  sourcePath: string;
  slug: string;
  title: string;
  number?: number;
  season?: number;
  date: Date;
  /** Absolute media URL. */
  media: string;
  mediaType: string;
  /** Enclosure length in bytes. */
  length: number;
  /** Duration in seconds. */
  duration?: number;
  episodeType: EpisodeType;
  explicit?: boolean;
  /** Plain-text summary, used in the feed description and meta tags. */
  summary: string;
  /** Show notes rendered from the Markdown body. */
  html: string;
  image?: string;
  guid?: string;
  guests: Person[];
  chapters: Chapter[];
  transcript?: Transcript;
  links: Link[];
}

export const isVideo = (episode: Pick<Episode, "mediaType">): boolean =>
  episode.mediaType.startsWith("video/");
