# Content format

A show is a folder. showsite reads two kinds of files from it:

```text
my-show/
  show.toml              show details (required)
  artwork.png            show artwork (path set in show.toml)
  episodes/              one Markdown file per episode
    001-pilot.md
    002-second.md
  transcripts/           optional; any path inside the folder works
    001-pilot.vtt
```

Files in `episodes/` must end in `.md`. Files whose names start with `_` are
ignored, which is handy for templates and notes.

All paths in `show.toml` and in front matter are relative to the show folder,
not to the file that mentions them.

## show.toml

```toml
title = "The Lamplight Workshop"          # required
author = "Wren Halloway and Osric Penhale" # required
description = "A small podcast about..."   # required, plain text
artwork = "artwork.svg"                    # required: file in the show folder, or an absolute URL
language = "en"                            # default "en"
categories = ["Leisure > Hobbies", "Education > How To"]
explicit = false                           # default false
type = "episodic"                          # "episodic" (default) or "serial"
medium = "podcast"                         # podcast:medium, e.g. "podcast", "video", "music"
copyright = "Copyright 2026 ..."
base_url = "https://example.com/show/"     # where the site is served
guid = "93c8db0b-..."                      # optional; pins podcast:guid
locked = false                             # optional; emits podcast:locked
theme = "theme"                            # optional; theme folder in the show folder

[owner]                                    # optional; itunes:owner
name = "Wren Halloway"
email = "hello@example.com"

[[hosts]]                                  # zero or more; podcast:person at channel level
name = "Wren Halloway"
role = "host"                              # default "host"
href = "https://example.com/wren"
img = "https://example.com/wren.jpg"

[[links]]                                  # zero or more; shown on the home page
title = "Website"
url = "https://example.com/lamplight"
```

### Categories

Each category is a string with one or two levels, separated by `>` or `/`:
`"Science"`, `"Science > Earth Sciences"`. Use the category names from the
Apple Podcasts list; showsite does not check them yet.

### Base URL

Feed links, Open Graph tags and the sitemap need absolute URLs, so a build
needs a base URL. showsite takes the first of:

1. `--base-url` on the command line
2. the `SHOWSITE_BASE_URL` environment variable
3. `base_url` in `show.toml`

A base URL with a path, such as `https://example.github.io/my-show/`, works:
links inside pages are written with that path.

### podcast:guid

When `guid` is not set, showsite derives `podcast:guid` from the feed URL as
the Podcasting 2.0 spec describes (a version 5 UUID of the URL without its
scheme). That value changes if the base URL changes, so once a show is
published, copy the generated `podcast:guid` into `show.toml`.

## Episodes

Each episode is a Markdown file. The front matter holds the episode's details
and the body holds the show notes. Front matter can be YAML between `---`
lines or TOML between `+++` lines.

```markdown
---
title: "First Light: Rewiring a 1950s Desk Lamp"   # required
date: 2026-08-04T09:00:00Z                          # required; a date or date-time
media: https://media.example.com/lamplight/ep001.mp3 # required; absolute URL
length: 28734120                                    # required; media size in bytes
duration: "00:29:55"                                # seconds or [HH:]MM:SS
number: 1
season: 1
episode_type: full                                  # full (default), trailer or bonus
explicit: false                                     # defaults to the show's setting
summary: "One or two plain sentences."              # default: first paragraph of the body
image: images/ep001.png                             # optional episode artwork
guid: "lamplight-s1e1"                              # optional; see below
slug: first-light                                   # default: file name without .md
media_type: audio/mpeg                              # default: from the media URL extension
transcript: transcripts/001-first-light.vtt
transcript_type: text/vtt                           # default: from the file extension
transcript_language: en                             # default: the show language
draft: false                                        # true skips the episode
guests:
  - name: Imelda Thornquist
    role: guest                                     # default "guest"
    href: https://example.com/imelda
    img: https://example.com/imelda.jpg
chapters:
  - start: "00:00"
    title: Welcome to the workshop
  - start: "02:10"
    title: Safety first, plug out
    url: https://example.com/safety
links:
  - title: Episode checklist
    url: https://example.com/checklist.pdf
---

Show notes in Markdown. The first paragraph is used as the summary when
`summary` is not set.
```

Quote durations and timestamps in YAML (`"00:29:55"`) so they are read as
text.

The same episode in TOML front matter:

```toml
+++
title = "The Escapement, Up Close"
date = 2026-09-01T09:00:00Z
media = "https://media.example.com/lamplight/ep003.mp4"
length = 184320512
duration = "00:24:10"

[[guests]]
name = "Basil Ardenwood"

[[chapters]]
start = "00:00"
title = "Why video for this one"
+++
```

### Media

`media` must be an absolute URL. showsite does not upload, download or measure
media; `length` is the file size in bytes that the RSS enclosure requires. The
media type is taken from the extension (`.mp3`, `.m4a`, `.aac`, `.ogg`,
`.opus`, `.flac`, `.wav`, `.mp4`, `.m4v`, `.mov`, `.webm`, `.m3u8`) unless
`media_type` is set. Episodes with a `video/` type get a video player; all
others get an audio player.

### Guids

Each feed item needs a guid that never changes, or podcast apps will show the
episode again as new. When `guid` is not set, showsite uses the episode page
URL as a permalink guid. Set `guid` explicitly before the first publish if the
base URL or the slug might ever change.

### Chapters

Chapters must be in increasing `start` order. They are written to
`episodes/<slug>/chapters.json` in the Podcasting 2.0 JSON chapters format
(version 1.2.0) and linked from the feed with `podcast:chapters`.

### Transcripts

The transcript file is copied to `episodes/<slug>/transcript.<ext>` and
linked from the feed with `podcast:transcript`. WebVTT and SRT files are
marked `rel="captions"`. On video episodes, a WebVTT transcript is also added
to the player as a captions track.

| Extension | Type |
| --- | --- |
| `.vtt` | `text/vtt` |
| `.srt` | `application/x-subrip` |
| `.json` | `application/json` |
| `.html`, `.htm` | `text/html` |
| `.txt` | `text/plain` |

### Show notes

The body is rendered with GitHub-flavored Markdown. Raw HTML in the body is
passed through as written, so only build content you trust.

## Output

```text
_site/
  index.html                         home page
  feed.xml                           podcast RSS feed
  sitemap.xml
  artwork.<ext>                      copied show artwork
  assets/                            theme assets (CSS, player script)
  episodes/<slug>/index.html         episode page
  episodes/<slug>/chapters.json      when the episode has chapters
  episodes/<slug>/transcript.<ext>   when the episode has a transcript
  .nojekyll                          tells GitHub Pages to serve files as-is
```

The output folder is emptied before each build. showsite refuses to use an
output folder that contains the show folder or the current folder.
