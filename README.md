# showsite

[![CI](https://github.com/plutado/showsite/actions/workflows/ci.yml/badge.svg)](https://github.com/plutado/showsite/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node 22+](https://img.shields.io/badge/node-22%2B-blue.svg)](https://nodejs.org/)

showsite is a static site generator for podcasts and video series. A show is
a folder: one `show.toml` with the show's details, and one Markdown file per
episode. showsite turns that folder into a website and a podcast feed you can
host anywhere that serves static files.

From one show folder it builds:

- a home page with the show's artwork, description, links and episode list
- one page per episode with an embedded audio or video player, show notes,
  guests, a chapter list you can click to seek, and links
- a podcast RSS feed with iTunes tags and Podcasting 2.0 tags
  (`podcast:guid`, `podcast:person`, `podcast:transcript`, `podcast:chapters`,
  `podcast:season`, `podcast:episode`, `podcast:medium`)
- a JSON chapters file per episode, in the Podcasting 2.0 chapters format
- transcripts copied next to each episode and linked from the feed
- `sitemap.xml`, and Open Graph and Twitter card tags on every page

The pages come from a small set of [Eta](https://eta.js.org/) templates, so you
can change the look without touching the generator.

**Status: early development.** The build works end to end for the demo show
and is covered by tests, including a structural check of the RSS feed. The
content format and theme data may still change before 1.0. Media files are not
hosted or processed by showsite; episodes point at media URLs you already have.
See [ROADMAP.md](ROADMAP.md).

Live demo: <https://plutado.github.io/showsite/> (built from
[examples/demo-show/](examples/demo-show/) by the Pages workflow).

## Who it is for

- Independent podcasters who want a site and a feed they own, without a
  hosting platform's page builder.
- Video series makers who publish episodes as files or streams and want an
  episode site with a proper feed.
- Small studios that run several shows and want the same simple, versionable
  setup for each.
- Educators publishing lecture or interview series alongside course material.

If you can edit a Markdown file and push to a Git repository, you can run a
show site with it.

## Built with

- TypeScript on Node.js 22, no framework
- [Eta](https://eta.js.org/) for templates (MIT)
- [marked](https://marked.js.org/) for Markdown (MIT)
- [smol-toml](https://github.com/squirrelchat/smol-toml) for `show.toml` and
  TOML front matter (BSD-3-Clause)
- [yaml](https://eemeli.org/yaml/) for YAML front matter (ISC)
- [Vitest](https://vitest.dev/) and `tsc --noEmit` for tests and checks, with
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) to
  parse the generated feed in tests

Those four runtime dependencies have no dependencies of their own. The feed and
sitemap XML are written by showsite directly.

## Quick start

showsite is not on npm yet. From a checkout of this repository:

```sh
npm ci
npm run build

# Build the demo show for local viewing
node dist/cli.js build examples/demo-show --out _site --base-url http://localhost:8080/

# Serve it with any static file server, for example:
python3 -m http.server 8080 --directory _site
```

Then open <http://localhost:8080/>. The demo's media URLs point at the
reserved `example.com` domain, so the players render but have nothing to play.

To start your own show, copy `examples/demo-show/` somewhere, edit
`show.toml`, replace the files in `episodes/`, and build it:

```sh
node dist/cli.js build path/to/my-show --out path/to/output
```

The base URL comes from `--base-url`, then the `SHOWSITE_BASE_URL` environment
variable, then `base_url` in `show.toml`. Feed and social card URLs must be
absolute, so a build without one fails.

The full content format is in [docs/content-format.md](docs/content-format.md).

## Example

A show folder:

```text
my-show/
  show.toml
  artwork.svg
  episodes/
    001-first-light.md
    002-tubes-and-patience.md
  transcripts/
    001-first-light.vtt
```

`show.toml`:

```toml
title = "The Lamplight Workshop"
author = "Wren Halloway and Osric Penhale"
description = "A small podcast about repairing old things."
language = "en"
artwork = "artwork.svg"
categories = ["Leisure > Hobbies", "Education > How To"]
base_url = "https://plutado.github.io/showsite/"

[owner]
name = "Wren Halloway"
email = "hello@example.com"

[[hosts]]
name = "Wren Halloway"
```

An episode, `episodes/001-first-light.md`:

```markdown
---
title: "First Light: Rewiring a 1950s Desk Lamp"
number: 1
season: 1
date: 2026-08-04T09:00:00Z
media: https://media.example.com/lamplight/ep001.mp3
length: 28734120
duration: "00:29:55"
transcript: transcripts/001-first-light.vtt
chapters:
  - start: "00:00"
    title: Welcome to the workshop
  - start: "02:10"
    title: Safety first, plug out
---

Wren and Osric open the workshop with the project that started it all.
```

Building the demo show:

```console
$ node dist/cli.js build examples/demo-show --out _site
Built "The Lamplight Workshop": 3 episodes, 14 files in /path/to/showsite/_site
Feed: https://plutado.github.io/showsite/feed.xml
```

Part of the generated feed item for that episode:

```xml
<guid isPermaLink="false">lamplight-s1e1</guid>
<pubDate>Tue, 04 Aug 2026 09:00:00 GMT</pubDate>
<enclosure url="https://media.example.com/lamplight/ep001.mp3" length="28734120" type="audio/mpeg"/>
<itunes:episodeType>full</itunes:episodeType>
<itunes:episode>1</itunes:episode>
<itunes:season>1</itunes:season>
<itunes:duration>00:29:55</itunes:duration>
<podcast:transcript url="https://plutado.github.io/showsite/episodes/001-first-light/transcript.vtt" type="text/vtt" language="en" rel="captions"/>
<podcast:chapters url="https://plutado.github.io/showsite/episodes/001-first-light/chapters.json" type="application/json+chapters"/>
```

The demo show, its hosts and guests, and all of its media are invented. The
artwork is a hand-written SVG in the repository.

## Development

```sh
npm ci
npm run lint    # tsc --noEmit over src and tests
npm test        # vitest
npm run build   # compile to dist/
npm run demo    # build, then build the demo show into _site/
```

The tests build the demo show into a temporary folder and check the output:
the feed is parsed as XML and checked for required channel and item tags,
every local URL in the feed must point at a built file, and two builds must
produce the same feed byte for byte.

See [CONTRIBUTING.md](CONTRIBUTING.md) and
[docs/system-design.md](docs/system-design.md).

## What's next

The full plan, with task-level estimates, is in [ROADMAP.md](ROADMAP.md).
Headline milestones, in working hours for one developer:

- **Feed validation** (14 to 18 h): a `showsite check` command that applies
  common directory rules (artwork size and format, required tags, guid
  stability, enclosure reachability) before you publish.
- **Interactive transcript pages** (12 to 16 h): WebVTT, SRT and JSON
  transcripts rendered as pages with speakers, click-to-seek and the current
  line highlighted.
- **Timed-media player and HLS** (14 to 20 h): an option to use the
  [0-0](https://github.com/plutado/0-0) player, and HLS output from vidprep as
  episode media with captions and alternate enclosures.
- **Dev server with live reload** (8 to 12 h): `showsite serve`, rebuilding on
  change.
- **Search** (8 to 12 h): a build-time index over titles, show notes and
  transcripts, searched in the browser.
- **Multiple shows per site** (10 to 14 h): one site, several shows, a feed per
  show and a network home page.
- **Import from Drupal and WordPress** (14 to 20 h): turn an existing site or
  feed into a show folder while keeping episode guids, so subscribers are not
  disrupted.
- **Themes and publishing** (8 to 12 h): partial theme overrides, PNG social
  cards, structured data, and a release on npm.

## Links

- Repository: <https://github.com/plutado/showsite>
- Issues: <https://github.com/plutado/showsite/issues>
- Demo site: <https://plutado.github.io/showsite/>
- Content format: [docs/content-format.md](docs/content-format.md)
- System design: [docs/system-design.md](docs/system-design.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- Podcasting 2.0 namespace: <https://podcastindex.org/namespace/1.0>
- 0-0 timed-media player: <https://github.com/plutado/0-0>

## License

MIT. See [LICENSE](LICENSE).
