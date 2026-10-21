import type { EpisodeOutput, Site } from "./site.js";

export interface ChaptersJson {
  version: "1.2.0";
  title?: string;
  podcastName?: string;
  chapters: Array<{ startTime: number; title: string; url?: string; img?: string }>;
}

/** Podcasting 2.0 JSON chapters document for one episode. */
export function chaptersJson(site: Site, out: EpisodeOutput): ChaptersJson {
  return {
    version: "1.2.0",
    title: out.episode.title,
    podcastName: site.show.title,
    chapters: out.episode.chapters.map((c) => {
      const chapter: ChaptersJson["chapters"][number] = { startTime: c.start, title: c.title };
      if (c.url) chapter.url = c.url;
      if (c.img) chapter.img = c.img;
      return chapter;
    }),
  };
}
