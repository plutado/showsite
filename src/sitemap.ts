import { lastUpdated, type Site } from "./site.js";
import { el, textEl } from "./xml.js";

const day = (d: Date): string => d.toISOString().slice(0, 10);

/** sitemap.xml listing the home page and every episode page. */
export function renderSitemap(site: Site): string {
  const entries = [
    el("url", {}, textEl("loc", site.urls.base) + textEl("lastmod", day(lastUpdated(site)))),
    ...site.episodes.map((out) =>
      el("url", {}, textEl("loc", out.pageUrl) + textEl("lastmod", day(out.episode.date))),
    ),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
}

