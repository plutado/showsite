# System design

showsite is a build step: it reads a show folder and writes a folder of static
files. There is no server, database or client-side framework.

## Pipeline

```text
show folder ──> load ──> Show ──> createSite ──> Site ──┬──> renderPages (Eta theme) ──> HTML
                (validate)        (URLs, guids)         ├──> renderFeed ──────────────> feed.xml
                                                        ├──> chaptersJson ────────────> chapters.json
                                                        ├──> renderSitemap ───────────> sitemap.xml
                                                        └──> copy artwork, transcripts, theme assets
```

1. **Load** (`src/load.ts`). Reads `show.toml` and every `episodes/*.md`,
   splits front matter (`src/frontmatter.ts`), renders the Markdown body, and
   normalizes fields: durations and chapter starts to seconds, categories to
   two-level pairs, people to `{ name, role }`. Every problem is collected
   with the file name and field and thrown as one `ShowsiteError`, so an
   author fixes everything in one pass. Drafts are dropped here. Episodes are
   sorted newest first, with ties broken by number and slug.
2. **Site** (`src/site.ts`). Given a base URL, computes every output path and
   URL once: page folders, chapters and transcript files, the artwork URL,
   item guids, and the show's `podcast:guid`. Renderers never build URLs
   themselves, which keeps the feed, the pages and the sitemap consistent.
3. **Render**. Each output is a pure function of the `Site`:
   - `renderFeed` (`src/feed.ts`) writes RSS 2.0 with the iTunes, Podcasting
     2.0, Atom and content namespaces, using small escaping helpers in
     `src/xml.ts`.
   - `renderPages` (`src/render.ts`) maps the site to plain view objects and
     renders them with the theme's Eta templates.
   - `chaptersJson` and `renderSitemap` produce the remaining files.
4. **Write** (`src/build.ts`). Empties the output folder, writes the rendered
   files, and copies artwork, transcripts, episode images and the theme's
   `assets/` folder.

`src/cli.ts` is a thin wrapper around `build()` using `node:util` `parseArgs`.

## Determinism

The same input produces the same bytes. `lastBuildDate` is the newest
episode's date rather than the build time, episode order is fully specified,
and nothing random is generated. This keeps diffs of the built site readable
and lets tests compare two builds.

## Themes

A theme is a folder with `layout.eta`, `home.eta` and `episode.eta`, optional
partials, and an optional `assets/` folder copied to the output. Templates get
view objects (`HomeData`, `EpisodeData` in `src/render.ts`) rather than the
internal model, so the internal model can change without breaking themes.
Interpolation with `<%= %>` is HTML-escaped; `<%~ %>` is raw and is used only
for the page body and rendered show notes.

The default theme works without JavaScript. `assets/player.js` adds one
enhancement: chapter buttons seek the player.

## URLs

The base URL is normalized to end in `/`. Absolute URLs (`site.urls.abs`) are
used in the feed, sitemap, canonical links and social tags. Links inside pages
use root-relative paths that include the base path (`site.urls.rel`), so a
site served from `https://example.github.io/my-show/` works without a
`<base>` element.

## Identity

- `podcast:guid` is pinned in `show.toml` or derived from the feed URL as a
  version 5 UUID in the Podcasting 2.0 namespace (`src/guid.ts`).
- Item guids are taken from front matter, or default to the episode page URL
  with `isPermaLink="true"`. Both defaults depend on the base URL, which is
  why the docs recommend pinning them before the first publish. The planned
  `showsite check` command will warn about this.

## Testing

Tests in `tests/` run against the TypeScript sources with Vitest. The main
integration tests build `examples/demo-show` into a temporary folder and:

- validate `feed.xml` as well-formed XML and parse it with fast-xml-parser
- check required channel and item tags, namespaces, enclosure attributes,
  guids, dates, ordering and the Podcasting 2.0 tags
- resolve every local URL in the feed to a built file
- compare two builds byte for byte
- check HTML pages for players, chapters, escaping and social tags

## Not in scope for the core

Hosting media, transcoding, measuring media files, analytics, and dynamic
features. These belong in separate tools or later optional milestones (see
`ROADMAP.md`).
