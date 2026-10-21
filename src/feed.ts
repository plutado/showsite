import { formatDuration } from "./duration.js";
import type { Person } from "./types.js";
import { lastUpdated, type EpisodeOutput, type Site } from "./site.js";
import { cdata, el, escapeXml, textEl } from "./xml.js";

export const NAMESPACES = {
  itunes: "http://www.itunes.com/dtds/podcast-1.0.dtd",
  podcast: "https://podcastindex.org/namespace/1.0",
  atom: "http://www.w3.org/2005/Atom",
  content: "http://purl.org/rss/1.0/modules/content/",
} as const;

const rfc822 = (d: Date): string => d.toUTCString();

function person(p: Person, group?: string): string {
  return textEl("podcast:person", p.name, { role: p.role, group, href: p.href, img: p.img });
}

function categoryXml(site: Site): string {
  return site.show.categories
    .map((c) =>
      c.sub
        ? el("itunes:category", { text: c.name }, el("itunes:category", { text: c.sub }))
        : el("itunes:category", { text: c.name }),
    )
    .join("");
}

function itemXml(out: EpisodeOutput): string {
  const e = out.episode;
  const parts = [
    textEl("title", e.title),
    textEl("link", out.pageUrl),
    textEl("description", e.summary),
    el("content:encoded", {}, cdata(e.html)),
    textEl("guid", out.guid, { isPermaLink: out.guidIsPermaLink ? "true" : "false" }),
    textEl("pubDate", rfc822(e.date)),
    el("enclosure", { url: e.media, length: e.length, type: e.mediaType }),
    textEl("itunes:title", e.title),
    textEl("itunes:episodeType", e.episodeType),
    e.number !== undefined ? textEl("itunes:episode", e.number) : "",
    e.season !== undefined ? textEl("itunes:season", e.season) : "",
    e.duration !== undefined ? textEl("itunes:duration", formatDuration(e.duration)) : "",
    e.explicit !== undefined ? textEl("itunes:explicit", e.explicit ? "true" : "false") : "",
    out.imageUrl ? el("itunes:image", { href: out.imageUrl }) : "",
    e.season !== undefined ? textEl("podcast:season", e.season) : "",
    e.number !== undefined ? textEl("podcast:episode", e.number) : "",
    out.transcriptUrl && e.transcript
      ? el("podcast:transcript", {
          url: out.transcriptUrl,
          type: e.transcript.type,
          language: e.transcript.language,
          rel: e.transcript.type === "application/x-subrip" || e.transcript.type === "text/vtt" ? "captions" : undefined,
        })
      : "",
    out.chaptersUrl ? el("podcast:chapters", { url: out.chaptersUrl, type: "application/json+chapters" }) : "",
    ...e.guests.map((g) => person(g)),
  ];
  return el("item", {}, "\n" + parts.filter(Boolean).join("\n") + "\n");
}

/** Render the podcast RSS 2.0 feed with iTunes and Podcasting 2.0 tags. */
export function renderFeed(site: Site): string {
  const s = site.show;
  const channel = [
    textEl("title", s.title),
    textEl("link", site.urls.base),
    textEl("description", s.description),
    textEl("language", s.language),
    s.copyright ? textEl("copyright", s.copyright) : "",
    textEl("generator", site.generator),
    textEl("lastBuildDate", rfc822(lastUpdated(site))),
    el("atom:link", { href: site.feedUrl, rel: "self", type: "application/rss+xml" }),
    el("image", {}, [textEl("url", site.artworkUrl), textEl("title", s.title), textEl("link", site.urls.base)].join("")),
    textEl("itunes:author", s.author),
    textEl("itunes:summary", s.description),
    el("itunes:image", { href: site.artworkUrl }),
    categoryXml(site),
    textEl("itunes:explicit", s.explicit ? "true" : "false"),
    textEl("itunes:type", s.type),
    s.owner
      ? el("itunes:owner", {}, textEl("itunes:name", s.owner.name) + textEl("itunes:email", s.owner.email))
      : "",
    textEl("podcast:guid", site.guid),
    textEl("podcast:medium", s.medium),
    s.locked !== undefined
      ? textEl("podcast:locked", s.locked ? "yes" : "no", { owner: s.owner?.email })
      : "",
    ...s.hosts.map((h) => person(h)),
    ...site.episodes.map((out) => itemXml(out)),
  ];
  const ns = Object.entries(NAMESPACES)
    .map(([prefix, uri]) => ` xmlns:${prefix}="${escapeXml(uri)}"`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"${ns}>\n${el(
    "channel",
    {},
    "\n" + channel.filter(Boolean).join("\n") + "\n",
  )}\n</rss>\n`;
}
