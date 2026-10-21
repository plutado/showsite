# Roadmap

Estimates are working hours for one developer, including tests and docs.
They are planning numbers, not commitments, and will be revised as each
milestone starts.

Remaining planned work: about 88 to 124 hours across milestones 1 to 8.

## Milestone 0: Scaffold (done)

- [x] Show folder format: `show.toml` plus Markdown episodes with YAML or TOML
      front matter
- [x] Loader that reports every content problem in one pass
- [x] RSS 2.0 feed with iTunes and Podcasting 2.0 tags
- [x] JSON chapters, transcripts copied and linked, sitemap
- [x] Default theme with audio and video players, chapter seeking, Open Graph
      and Twitter card tags
- [x] `showsite build` command with configurable base URL
- [x] Demo show, tests that parse and check the feed, CI and Pages workflows

## Milestone 1: Feed validation (14 to 18 h)

Catch the problems that get a feed rejected by podcast directories before it
is published.

- [ ] `showsite check <show>` command with ok, warn and fail lines and a
      non-zero exit on failure (2 h)
- [ ] Artwork checks: read PNG and JPEG headers, require square artwork of
      1400 to 3000 px, warn on SVG or oversize files (3 h)
- [ ] Rule set for required and recommended tags, written as data so rules
      can be listed and documented (3 h)
- [ ] Guid checks: duplicates, and a warning when guids would change with the
      base URL (2 h)
- [ ] Optional `--check-media`: HEAD requests to compare enclosure length and
      type with the front matter, with a per-host rate limit (3 to 4 h)
- [ ] Validate chapters and transcript files (JSON shape, WebVTT header,
      cue order) (2 to 3 h)
- [ ] Document each rule and its source in `docs/feed-rules.md` (1 to 2 h)

## Milestone 2: Interactive transcript pages (12 to 16 h)

- [ ] Parse WebVTT, SRT and Podcasting 2.0 JSON transcripts into one cue
      model with speakers (4 h)
- [ ] Transcript page per episode with speaker labels and timestamps (3 h)
- [ ] Click a line to seek; highlight the current line during playback,
      without breaking the page when scripts are off (3 to 4 h)
- [ ] Emit an HTML transcript and list it as a second `podcast:transcript` (1 to 2 h)
- [ ] Accessibility pass: keyboard use, focus, screen reader labels (1 to 3 h)

## Milestone 3: Timed-media player and HLS (14 to 20 h)

- [ ] Theme option to render episodes with the
      [0-0](https://github.com/plutado/0-0) timed-media player, with the
      native player as fallback (4 to 6 h)
- [ ] Read vidprep HLS output (master playlist, renditions, poster, captions)
      and use it as episode media (4 to 6 h)
- [ ] `podcast:alternateEnclosure` for HLS and alternate encodings (3 to 4 h)
- [ ] Captions tracks from transcripts on video episodes, with language
      labels (2 h)
- [ ] Per-episode poster images and video dimensions in Open Graph tags (1 to 2 h)

## Milestone 4: Dev server with live reload (8 to 12 h)

- [ ] `showsite serve` with a static server that respects the base path (2 to 3 h)
- [ ] Watch the show folder and theme; rebuild on change (2 to 3 h)
- [ ] Live reload through server-sent events, injected only in dev (2 to 3 h)
- [ ] Show content errors in the browser instead of exiting (2 to 3 h)

## Milestone 5: Search (8 to 12 h)

- [ ] Build-time index of titles, summaries, show notes and transcript text,
      kept small by stemming and field weights (3 to 4 h)
- [ ] Search page in the default theme, working offline from the index file (3 to 4 h)
- [ ] Results that link into the episode at the transcript timestamp (2 to 4 h)

## Milestone 6: Multiple shows per site (10 to 14 h)

- [ ] `site.toml` listing shows, each with its own folder and feed (3 to 4 h)
- [ ] Network home page and per-show paths (3 to 4 h)
- [ ] Shared hosts and guests across shows, with person pages (2 to 3 h)
- [ ] Site-wide sitemap and an OPML file of all feeds (2 to 3 h)

## Milestone 7: Import from Drupal, WordPress and existing feeds (14 to 20 h)

- [ ] Import any existing podcast RSS feed into a show folder, keeping guids,
      dates and enclosure details (5 to 7 h)
- [ ] WordPress import from a WXR export, including common podcast plugin
      fields (4 to 6 h)
- [ ] Drupal import through JSON:API or a CSV export, with a field mapping
      file (4 to 6 h)
- [ ] Import report listing anything that could not be mapped (1 h)

## Milestone 8: Themes and publishing (8 to 12 h)

- [ ] Partial theme overrides: a custom theme only needs the templates it
      changes, the rest fall back to the default (2 to 3 h)
- [ ] PNG social card per episode, since most social sites ignore SVG (2 to 3 h)
- [ ] JSON-LD structured data for the series and episodes (1 to 2 h)
- [ ] Theme documentation with the full template data reference (1 to 2 h)
- [ ] First npm release with `npx showsite` support (2 h)
