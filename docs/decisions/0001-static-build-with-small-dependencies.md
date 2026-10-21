# 0001: Static build in TypeScript with a few small dependencies

- Status: accepted
- Date: 2026-10-21

## Context

showsite needs to read a folder of TOML and Markdown, render HTML pages from
user-editable templates, and write a podcast feed that directories accept.
The intended users are independent podcasters, video series makers, small
studios and educators. Many will fork a theme and run builds in CI. The tool
should be easy to read, quick to install, and safe to depend on for years.

Options considered:

1. A plugin for an existing static site generator (Eleventy, Astro, Hugo).
2. A framework-based generator (React or Vue server rendering).
3. A small standalone generator with a few focused libraries.

## Decision

Build a standalone generator in TypeScript on Node.js 22 with no framework:

- **Templates: Eta.** Themes are plain `.eta` files that look like HTML with
  JavaScript expressions. Eta escapes interpolations by default, supports
  layouts and partials, and has no dependencies. Tagged template literals
  were considered; they are type-safe but would make themes TypeScript code
  that has to be compiled, which is a barrier for people editing a theme.
- **Markdown: marked.** Fast, MIT licensed, no dependencies, GitHub-flavored
  Markdown by default. markdown-it was considered; it pulls in a dependency
  under the Python Software Foundation license, and the project keeps runtime
  dependencies to MIT, ISC and BSD.
- **TOML: smol-toml; YAML: yaml.** `show.toml` is TOML because it is easy to
  edit by hand and has no indentation pitfalls. Episode front matter accepts
  YAML too, since many Markdown authors already write it.
- **XML: written by hand.** The feed and sitemap use a few escaping helpers
  instead of an XML library. The structure is fixed and small, and owning it
  keeps tag order and namespaces exactly as intended. Tests parse the output
  with a real XML parser to make sure it stays well-formed.
- **Checks: `tsc --noEmit` and Vitest.** A separate linter can come later if
  the codebase grows; for now strict TypeScript settings catch most issues
  with fewer dependencies.

## Consequences

- Installing showsite pulls in four runtime packages with no transitive
  dependencies.
- Theme authors work with HTML-like files and a documented data object, not a
  component model.
- Feed correctness rests on our own code and tests rather than a feed
  library, so every new tag needs a test that parses the feed.
- Moving to an existing generator later would mean porting templates, but the
  loader and feed code would carry over unchanged.
- Development dependencies (TypeScript, Vitest and their tooling) include
  packages under Apache-2.0 and MPL-2.0. They are not shipped to users.
