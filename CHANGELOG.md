# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/) once 1.0 is released.

## [Unreleased]

## [0.1.0] - 2026-10-21

### Added

- Show folder format: `show.toml` plus one Markdown file per episode, with
  YAML (`---`) or TOML (`+++`) front matter.
- Loader that validates the whole show and reports every problem at once.
- RSS 2.0 feed with iTunes tags and Podcasting 2.0 `podcast:guid`,
  `podcast:medium`, `podcast:person`, `podcast:transcript`,
  `podcast:chapters`, `podcast:season`, `podcast:episode` and
  `podcast:locked`.
- JSON chapters files, copied transcripts, `sitemap.xml` and `.nojekyll`.
- Default Eta theme: home page, episode pages with audio or video players,
  chapter seeking, Open Graph and Twitter card tags.
- `showsite build` command; base URL from `--base-url`, `SHOWSITE_BASE_URL`
  or `base_url` in `show.toml`.
- Invented demo show in `examples/demo-show/` with three episodes.
- Tests that build the demo show and check the feed structurally.
- CI workflow and a GitHub Pages workflow that publishes the demo show.

[Unreleased]: https://github.com/plutado/showsite/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/plutado/showsite/releases/tag/v0.1.0
