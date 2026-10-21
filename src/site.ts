import { basename, extname } from "node:path";
import { podcastGuid } from "./guid.js";
import type { Episode, Show } from "./types.js";
import { isAbsoluteUrl, siteUrls, type SiteUrls } from "./urls.js";

/** Output paths and URLs for one episode, relative to the site root. */
export interface EpisodeOutput {
  episode: Episode;
  /** Folder for the episode, e.g. "episodes/001-welcome/". */
  dir: string;
  pagePath: string;
  pageUrl: string;
  chaptersPath?: string;
  chaptersUrl?: string;
  transcriptPath?: string;
  transcriptUrl?: string;
  /** Item guid and whether it is a permalink. */
  guid: string;
  guidIsPermaLink: boolean;
  imageUrl?: string;
}

/** Everything the renderers need: the loaded show plus resolved URLs. */
export interface Site {
  show: Show;
  urls: SiteUrls;
  feedPath: string;
  feedUrl: string;
  /** podcast:guid for the show. */
  guid: string;
  /** Output path of the copied artwork, when it is a local file. */
  artworkPath?: string;
  artworkUrl: string;
  episodes: EpisodeOutput[];
  generator: string;
}

export const GENERATOR = "showsite";

export function createSite(show: Show, baseUrl: string): Site {
  const urls = siteUrls(baseUrl);
  const feedPath = "feed.xml";
  const feedUrl = urls.abs(feedPath);

  let artworkPath: string | undefined;
  let artworkUrl: string;
  if (isAbsoluteUrl(show.artwork)) {
    artworkUrl = show.artwork;
  } else {
    artworkPath = `artwork${extname(show.artwork).toLowerCase()}`;
    artworkUrl = urls.abs(artworkPath);
  }

  const episodes = show.episodes.map((episode): EpisodeOutput => {
    const dir = `episodes/${episode.slug}/`;
    const out: EpisodeOutput = {
      episode,
      dir,
      pagePath: `${dir}index.html`,
      pageUrl: urls.abs(dir),
      // Stable default guid: the episode page URL. Set "guid" in front matter
      // before the first publish if the base URL may change.
      guid: episode.guid ?? urls.abs(dir),
      guidIsPermaLink: episode.guid === undefined,
    };
    if (episode.chapters.length > 0) {
      out.chaptersPath = `${dir}chapters.json`;
      out.chaptersUrl = urls.abs(out.chaptersPath);
    }
    if (episode.transcript) {
      out.transcriptPath = `${dir}${episode.transcript.fileName}`;
      out.transcriptUrl = urls.abs(out.transcriptPath);
    }
    if (episode.image) {
      out.imageUrl = isAbsoluteUrl(episode.image) ? episode.image : urls.abs(`${dir}${basename(episode.image)}`);
    }
    return out;
  });

  const site: Site = {
    show,
    urls,
    feedPath,
    feedUrl,
    guid: show.guid ?? podcastGuid(feedUrl),
    artworkUrl,
    episodes,
    generator: GENERATOR,
  };
  if (artworkPath) site.artworkPath = artworkPath;
  return site;
}

/** The newest episode date, used as lastBuildDate so builds are reproducible. */
export function lastUpdated(site: Site): Date {
  return site.episodes[0]?.episode.date ?? new Date(0);
}
