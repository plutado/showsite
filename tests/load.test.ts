import { describe, expect, it } from "vitest";
import { ShowsiteError } from "../src/errors.js";
import { loadShow } from "../src/load.js";
import { DEMO_SHOW, MINIMAL_SHOW_TOML, episodeMd, fixture } from "./helpers.js";

describe("loadShow with the demo show", () => {
  const show = loadShow(DEMO_SHOW);

  it("reads show.toml", () => {
    expect(show.title).toBe("The Lamplight Workshop");
    expect(show.language).toBe("en");
    expect(show.categories).toEqual([
      { name: "Leisure", sub: "Hobbies" },
      { name: "Education", sub: "How To" },
    ]);
    expect(show.hosts.map((h) => h.role)).toEqual(["host", "host"]);
    expect(show.owner?.email).toBe("hello@example.com");
  });

  it("loads episodes newest first", () => {
    expect(show.episodes.map((e) => e.slug)).toEqual([
      "003-the-escapement",
      "002-tubes-and-patience",
      "001-first-light",
    ]);
  });

  it("parses YAML and TOML episode front matter", () => {
    const [ep3, ep2, ep1] = show.episodes;
    expect(ep1!.duration).toBe(29 * 60 + 55);
    expect(ep1!.chapters[1]).toEqual({ start: 130, title: "Safety first, plug out" });
    expect(ep1!.transcript?.type).toBe("text/vtt");
    expect(ep2!.guests).toEqual([{ name: "Imelda Thornquist", role: "guest", href: "https://example.com/imelda" }]);
    expect(ep3!.mediaType).toBe("video/mp4");
    expect(ep3!.chapters).toHaveLength(3);
  });

  it("uses the first paragraph as the summary when none is given", () => {
    expect(show.episodes[2]!.summary).toMatch(/^Wren and Osric open the workshop/);
    expect(show.episodes[0]!.summary).toMatch(/^Our first video episode/);
  });
});

describe("loadShow validation", () => {
  it("reports every problem at once", () => {
    const dir = fixture({
      "show.toml": 'title = "Only a title"\n',
      "episodes/bad.md": episodeMd(`
title: Bad episode
date: not a date
media: /relative.mp3
duration: "1:99"
chapters:
  - start: "05:00"
    title: Later
  - start: "01:00"
    title: Earlier
`),
    });
    let error: unknown;
    try {
      loadShow(dir);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(ShowsiteError);
    const problems = (error as ShowsiteError).problems.join("\n");
    expect(problems).toMatch(/show.toml: "author" is required/);
    expect(problems).toMatch(/show.toml: "artwork" is required/);
    expect(problems).toMatch(/episodes\/bad.md: "date" is required/);
    expect(problems).toMatch(/"media" must be an absolute URL/);
    expect(problems).toMatch(/"length" .* is required/);
    expect(problems).toMatch(/"duration" must be/);
    expect(problems).toMatch(/increasing start order/);
  });

  it("skips drafts", () => {
    const dir = fixture({
      "show.toml": MINIMAL_SHOW_TOML,
      "episodes/draft.md": episodeMd("title: Draft\ndraft: true"),
    });
    expect(loadShow(dir).episodes).toEqual([]);
  });

  it("rejects duplicate slugs", () => {
    const ep = (slug: string) =>
      episodeMd(`title: A\nslug: ${slug}\ndate: 2026-01-01\nmedia: https://example.com/a.mp3\nlength: 1`);
    const dir = fixture({
      "show.toml": MINIMAL_SHOW_TOML,
      "episodes/a.md": ep("same"),
      "episodes/b.md": ep("same"),
    });
    expect(() => loadShow(dir)).toThrow(/slug "same" is also used/);
  });

  it("fails clearly when show.toml is missing", () => {
    expect(() => loadShow(fixture({}))).toThrow(/No show.toml/);
  });
});
