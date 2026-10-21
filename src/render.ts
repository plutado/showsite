import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Eta } from "eta";
import { formatDuration, humanDuration } from "./duration.js";
import { ShowsiteError } from "./errors.js";
import { isVideo, type Link, type Person } from "./types.js";
import type { EpisodeOutput, Site } from "./site.js";

/** The theme that ships with showsite. Resolves from both src/ and dist/. */
export const DEFAULT_THEME_DIR = fileURLToPath(new URL("../themes/default/", import.meta.url));

export const REQUIRED_TEMPLATES = ["layout", "home", "episode"] as const;

/** Values every page gets for its head: title, canonical URL, social card. */
export interface PageMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  ogType: "website" | "article";
  feedUrl: string;
  siteName: string;
  language: string;
  media?: { url: string; type: string; isVideo: boolean };
}

export interface ChapterView {
  start: number;
  label: string;
  title: string;
  url?: string;
}

export interface EpisodeView {
  slug: string;
  title: string;
  /** Root-relative page URL. */
  url: string;
  number?: number;
  season?: number;
  dateIso: string;
  dateLabel: string;
  durationLabel?: string;
  summary: string;
  html: string;
  media: string;
  mediaType: string;
  isVideo: boolean;
  posterUrl: string;
  guests: Person[];
  chapters: ChapterView[];
  chaptersUrl?: string;
  transcriptUrl?: string;
  links: Link[];
}

export interface SiteView {
  title: string;
  author: string;
  description: string;
  language: string;
  /** Root-relative home URL. */
  homeUrl: string;
  /** Root-relative URL of a theme asset. */
  asset: (name: string) => string;
  feedUrl: string;
  artworkUrl: string;
  hosts: Person[];
  links: Link[];
  copyright?: string;
  generator: string;
}

export interface HomeData {
  site: SiteView;
  meta: PageMeta;
  episodes: EpisodeView[];
}

export interface EpisodeData {
  site: SiteView;
  meta: PageMeta;
  episode: EpisodeView;
  newer?: EpisodeView;
  older?: EpisodeView;
}

function dateLabel(date: Date, language: string): string {
  try {
    return date.toLocaleDateString(language, { dateStyle: "long", timeZone: "UTC" });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function episodeView(site: Site, out: EpisodeOutput): EpisodeView {
  const e = out.episode;
  const view: EpisodeView = {
    slug: e.slug,
    title: e.title,
    url: site.urls.rel(out.dir),
    dateIso: e.date.toISOString(),
    dateLabel: dateLabel(e.date, site.show.language),
    summary: e.summary,
    html: e.html,
    media: e.media,
    mediaType: e.mediaType,
    isVideo: isVideo(e),
    posterUrl: out.imageUrl ?? site.artworkUrl,
    guests: e.guests,
    chapters: e.chapters.map((c) => {
      const chapter: ChapterView = { start: c.start, label: formatDuration(c.start, true), title: c.title };
      if (c.url) chapter.url = c.url;
      return chapter;
    }),
    links: e.links,
  };
  if (e.number !== undefined) view.number = e.number;
  if (e.season !== undefined) view.season = e.season;
  if (e.duration !== undefined) view.durationLabel = humanDuration(e.duration);
  if (out.chaptersPath) view.chaptersUrl = site.urls.rel(out.chaptersPath);
  if (out.transcriptPath) view.transcriptUrl = site.urls.rel(out.transcriptPath);
  return view;
}

function siteView(site: Site): SiteView {
  const s = site.show;
  const view: SiteView = {
    title: s.title,
    author: s.author,
    description: s.description,
    language: s.language,
    homeUrl: site.urls.basePath,
    asset: (name) => site.urls.rel(`assets/${name}`),
    feedUrl: site.feedUrl,
    artworkUrl: site.artworkUrl,
    hosts: s.hosts,
    links: s.links,
    generator: site.generator,
  };
  if (s.copyright) view.copyright = s.copyright;
  return view;
}

export interface RenderedPage {
  path: string;
  html: string;
}

/** Render the home page and all episode pages with the show's theme. */
export function renderPages(site: Site, themeDir: string): RenderedPage[] {
  for (const name of REQUIRED_TEMPLATES) {
    if (!existsSync(join(themeDir, `${name}.eta`))) {
      throw new ShowsiteError(`Theme ${themeDir} is missing ${name}.eta`);
    }
  }
  const eta = new Eta({ views: themeDir, cache: false, autoTrim: false });
  const sv = siteView(site);
  const views = site.episodes.map((out) => episodeView(site, out));
  const baseMeta = {
    feedUrl: site.feedUrl,
    siteName: site.show.title,
    language: site.show.language,
  };

  const pages: RenderedPage[] = [];
  const home: HomeData = {
    site: sv,
    episodes: views,
    meta: {
      ...baseMeta,
      title: site.show.title,
      description: site.show.description,
      canonicalUrl: site.urls.base,
      imageUrl: site.artworkUrl,
      ogType: "website",
    },
  };
  pages.push({ path: "index.html", html: eta.render("home", home) });

  site.episodes.forEach((out, i) => {
    const view = views[i]!;
    const data: EpisodeData = {
      site: sv,
      episode: view,
      meta: {
        ...baseMeta,
        title: `${view.title} | ${site.show.title}`,
        description: view.summary || site.show.description,
        canonicalUrl: out.pageUrl,
        imageUrl: out.imageUrl ?? site.artworkUrl,
        ogType: "article",
        media: { url: view.media, type: view.mediaType, isVideo: view.isVideo },
      },
    };
    const newer = views[i - 1];
    const older = views[i + 1];
    if (newer) data.newer = newer;
    if (older) data.older = older;
    pages.push({ path: out.pagePath, html: eta.render("episode", data) });
  });
  return pages;
}
