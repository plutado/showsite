import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { beforeAll, describe, expect, it } from "vitest";
import { build } from "../src/build.js";
import { main } from "../src/cli.js";
import { DEMO_SHOW, MINIMAL_SHOW_TOML, episodeMd, fixture, tempDir } from "./helpers.js";

const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");

describe("building the demo show", () => {
  let out: string;
  beforeAll(() => {
    out = tempDir();
    build({ showDir: DEMO_SHOW, outDir: out });
  });

  it("writes the expected files", () => {
    for (const path of [
      "index.html",
      "feed.xml",
      "sitemap.xml",
      ".nojekyll",
      "artwork.svg",
      "assets/style.css",
      "assets/player.js",
      "episodes/001-first-light/index.html",
      "episodes/001-first-light/chapters.json",
      "episodes/001-first-light/transcript.vtt",
      "episodes/002-tubes-and-patience/index.html",
      "episodes/003-the-escapement/index.html",
      "episodes/003-the-escapement/chapters.json",
    ]) {
      expect(existsSync(join(out, path)), path).toBe(true);
    }
    expect(existsSync(join(out, "episodes/003-the-escapement/transcript.vtt"))).toBe(false);
  });

  it("lists every episode on the home page, newest first", () => {
    const html = read(out, "index.html");
    const links = [...html.matchAll(/<h3><a href="([^"]+)">/g)].map((m) => m[1]);
    expect(links).toEqual([
      "/showsite/episodes/003-the-escapement/",
      "/showsite/episodes/002-tubes-and-patience/",
      "/showsite/episodes/001-first-light/",
    ]);
    expect(html).toContain('<link rel="alternate" type="application/rss+xml"');
    expect(html).toContain('<meta property="og:type" content="website">');
  });

  it("renders an audio player, chapters and social meta on an audio episode", () => {
    const html = read(out, "episodes/001-first-light/index.html");
    expect(html).toContain('<audio class="player" controls');
    expect(html).toContain('<source src="https://media.example.com/lamplight/ep001.mp3" type="audio/mpeg">');
    expect(html).toContain('<button type="button" data-seek="130">02:10</button> Safety first, plug out');
    expect(html).toContain('<meta property="og:audio" content="https://media.example.com/lamplight/ep001.mp3">');
    expect(html).toContain('<link rel="canonical" href="https://plutado.github.io/showsite/episodes/001-first-light/">');
    expect(html).toContain("<title>First Light: Rewiring a 1950s Desk Lamp | The Lamplight Workshop</title>");
    expect(html).toContain('rel="next" href="/showsite/episodes/002-tubes-and-patience/"');
  });

  it("renders a video player on a video episode", () => {
    const html = read(out, "episodes/003-the-escapement/index.html");
    expect(html).toContain('<video class="player" controls');
    expect(html).toContain('type="video/mp4"');
    expect(html).toContain('<meta property="og:video" content="https://media.example.com/lamplight/ep003.mp4">');
  });

  it("escapes episode titles in HTML", () => {
    const html = read(out, "episodes/002-tubes-and-patience/index.html");
    expect(html).toContain("<h1>Tubes &amp; Patience: A Kitchen Radio Comes Back</h1>");
  });

  it("writes Podcasting 2.0 JSON chapters", () => {
    const json = JSON.parse(read(out, "episodes/001-first-light/chapters.json"));
    expect(json.version).toBe("1.2.0");
    expect(json.chapters).toEqual([
      { startTime: 0, title: "Welcome to the workshop" },
      { startTime: 130, title: "Safety first, plug out" },
      { startTime: 585, title: "Choosing new cord and a socket" },
      { startTime: 1290, title: "The first test" },
    ]);
  });

  it("writes a sitemap with the home page and every episode", () => {
    const xml = read(out, "sitemap.xml");
    expect(XMLValidator.validate(xml)).toBe(true);
    const doc = new XMLParser({ isArray: (n) => n === "url" }).parse(xml);
    const locs = doc.urlset.url.map((u: { loc: string }) => u.loc);
    expect(locs).toEqual([
      "https://plutado.github.io/showsite/",
      "https://plutado.github.io/showsite/episodes/003-the-escapement/",
      "https://plutado.github.io/showsite/episodes/002-tubes-and-patience/",
      "https://plutado.github.io/showsite/episodes/001-first-light/",
    ]);
  });
});

describe("build options", () => {
  it("lets the base URL be overridden", () => {
    const out = tempDir();
    build({ showDir: DEMO_SHOW, outDir: out, baseUrl: "http://localhost:8080" });
    expect(read(out, "feed.xml")).toContain('<atom:link href="http://localhost:8080/feed.xml"');
    expect(read(out, "index.html")).toContain('href="/episodes/001-first-light/"');
  });

  it("refuses output folders that would delete the show or the working folder", () => {
    const show = fixture({ "show.toml": MINIMAL_SHOW_TOML });
    expect(() => build({ showDir: show, outDir: show })).toThrow(/outside the show folder/);
    expect(() => build({ showDir: show, outDir: join(show, "..") })).toThrow(/outside the show folder/);
    expect(() => build({ showDir: show, outDir: join(show, "_site") })).toThrow(/outside the show folder/);
    expect(() => build({ showDir: show, outDir: process.cwd() })).toThrow(/Refusing to empty/);
  });

  it("requires a base URL", () => {
    const dir = fixture({ "show.toml": MINIMAL_SHOW_TOML.replace(/^base_url.*$/m, "") });
    expect(() => build({ showDir: dir, outDir: tempDir() })).toThrow(/No base URL/);
  });

  it("uses a custom theme folder", () => {
    const theme = fixture({
      "layout.eta": "<html><%~ it.body %></html>",
      "home.eta": '<% layout("layout") %>HOME <%= it.site.title %> <%= it.episodes.length %>',
      "episode.eta": '<% layout("layout") %>EPISODE <%= it.episode.title %>',
    });
    const show = fixture({
      "show.toml": MINIMAL_SHOW_TOML,
      "episodes/one.md": episodeMd("title: One <b>\ndate: 2026-01-01\nmedia: https://example.com/1.mp3\nlength: 1"),
    });
    const out = tempDir();
    build({ showDir: show, outDir: out, themeDir: theme });
    expect(read(out, "index.html")).toBe("<html>HOME Fixture Show 1</html>");
    expect(read(out, "episodes/one/index.html")).toBe("<html>EPISODE One &lt;b&gt;</html>");
    expect(existsSync(join(out, "assets"))).toBe(false);
  });

  it("rejects a theme that is missing templates", () => {
    const theme = fixture({ "layout.eta": "x" });
    const show = fixture({ "show.toml": MINIMAL_SHOW_TOML });
    expect(() => build({ showDir: show, outDir: tempDir(), themeDir: theme })).toThrow(/missing home.eta/);
  });
});

describe("cli", () => {
  it("builds the demo show and honors SHOWSITE_BASE_URL", () => {
    const out = tempDir();
    const code = main(["build", DEMO_SHOW, "--out", out], { SHOWSITE_BASE_URL: "https://example.org/pod/" });
    expect(code).toBe(0);
    expect(read(out, "feed.xml")).toContain("https://example.org/pod/feed.xml");
  });

  it("returns 1 for content errors and 2 for usage errors", () => {
    expect(main(["build", fixture({}), "--out", tempDir()], {})).toBe(1);
    expect(main(["publish"], {})).toBe(2);
  });
});
