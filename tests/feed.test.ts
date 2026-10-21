import { readFileSync } from "node:fs";
import { join } from "node:path";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { beforeAll, describe, expect, it } from "vitest";
import { build } from "../src/build.js";
import { loadShow } from "../src/load.js";
import { renderFeed } from "../src/feed.js";
import { createSite } from "../src/site.js";
import { DEMO_SHOW, MINIMAL_SHOW_TOML, episodeMd, fixture, tempDir } from "./helpers.js";

type Node = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  // Keep these as arrays even when a feed has a single one.
  isArray: (name) => ["item", "podcast:person", "itunes:category", "podcast:transcript"].includes(name),
});

function parseFeed(xml: string): { rss: Node; channel: Node; items: Node[] } {
  const valid = XMLValidator.validate(xml);
  if (valid !== true) throw new Error(`feed is not well-formed XML: ${JSON.stringify(valid.err)}`);
  const doc = parser.parse(xml) as Node;
  const rss = doc.rss as Node;
  const channel = rss.channel as Node;
  return { rss, channel, items: (channel.item as Node[]) ?? [] };
}

describe("RSS feed for the demo show", () => {
  let out: string;
  let xml: string;
  let feed: ReturnType<typeof parseFeed>;

  beforeAll(() => {
    out = tempDir();
    build({ showDir: DEMO_SHOW, outDir: out });
    xml = readFileSync(join(out, "feed.xml"), "utf8");
    feed = parseFeed(xml);
  });

  it("is RSS 2.0 with the iTunes, Podcasting 2.0, Atom and content namespaces", () => {
    expect(feed.rss["@version"]).toBe("2.0");
    expect(feed.rss["@xmlns:itunes"]).toBe("http://www.itunes.com/dtds/podcast-1.0.dtd");
    expect(feed.rss["@xmlns:podcast"]).toBe("https://podcastindex.org/namespace/1.0");
    expect(feed.rss["@xmlns:atom"]).toBe("http://www.w3.org/2005/Atom");
    expect(feed.rss["@xmlns:content"]).toBe("http://purl.org/rss/1.0/modules/content/");
  });

  it("has the required channel tags", () => {
    const c = feed.channel;
    for (const tag of ["title", "link", "description", "language", "itunes:author", "itunes:explicit", "podcast:guid"]) {
      expect(c[tag], tag).toBeDefined();
      expect(c[tag], tag).not.toBe("");
    }
    expect(c.link).toBe("https://plutado.github.io/showsite/");
    expect((c["itunes:image"] as Node)["@href"]).toBe("https://plutado.github.io/showsite/artwork.svg");
    expect((c["atom:link"] as Node)["@rel"]).toBe("self");
    expect((c["atom:link"] as Node)["@href"]).toBe("https://plutado.github.io/showsite/feed.xml");
    // The parser converts "false" to a boolean.
    expect(c["itunes:explicit"]).toBe(false);
    expect(c["podcast:guid"]).toBe("93c8db0b-5fcf-513d-a0a8-3430d8294b5d");
    const cats = c["itunes:category"] as Node[];
    expect(cats.map((x) => x["@text"])).toEqual(["Leisure", "Education"]);
    expect(((cats[0]!["itunes:category"] as Node[])[0] as Node)["@text"]).toBe("Hobbies");
    const owner = c["itunes:owner"] as Node;
    expect(owner["itunes:email"]).toBe("hello@example.com");
    const hosts = c["podcast:person"] as Node[];
    expect(hosts.map((p) => [p["#text"], p["@role"]])).toEqual([
      ["Wren Halloway", "host"],
      ["Osric Penhale", "host"],
    ]);
  });

  it("has one item per episode with an enclosure, guid and pubDate", () => {
    expect(feed.items).toHaveLength(3);
    for (const item of feed.items) {
      expect(item.title).toBeTruthy();
      expect(item.pubDate).toMatch(/^\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
      const enclosure = item.enclosure as Node;
      expect(enclosure["@url"]).toMatch(/^https:\/\/media\.example\.com\//);
      expect(Number(enclosure["@length"])).toBeGreaterThan(0);
      expect(enclosure["@type"]).toMatch(/^(audio|video)\//);
      const guid = item.guid as Node;
      expect(guid["#text"]).toMatch(/^lamplight-s1e\d$/);
      expect(guid["@isPermaLink"]).toBe("false");
      expect(item["itunes:duration"]).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(item["itunes:episodeType"]).toBe("full");
    }
  });

  it("orders items newest first and numbers them", () => {
    expect(feed.items.map((i) => i["itunes:episode"])).toEqual([3, 2, 1]);
    expect(feed.items.map((i) => i["podcast:episode"])).toEqual([3, 2, 1]);
    expect(feed.items.every((i) => i["itunes:season"] === 1)).toBe(true);
  });

  it("links transcripts, chapters and guests with Podcasting 2.0 tags", () => {
    const ep1 = feed.items[2]!;
    const transcript = (ep1["podcast:transcript"] as Node[])[0]!;
    expect(transcript["@url"]).toBe("https://plutado.github.io/showsite/episodes/001-first-light/transcript.vtt");
    expect(transcript["@type"]).toBe("text/vtt");
    const chapters = ep1["podcast:chapters"] as Node;
    expect(chapters["@type"]).toBe("application/json+chapters");
    expect(chapters["@url"]).toBe("https://plutado.github.io/showsite/episodes/001-first-light/chapters.json");

    const ep2 = feed.items[1]!;
    const guest = (ep2["podcast:person"] as Node[])[0]!;
    expect(guest["#text"]).toBe("Imelda Thornquist");
    expect(guest["@role"]).toBe("guest");

    expect(feed.items[0]!["podcast:transcript"]).toBeUndefined();
  });

  it("points every local feed URL at a file that was built", () => {
    const prefix = "https://plutado.github.io/showsite/";
    const urls = [...xml.matchAll(/(?:url|href)="([^"]+)"/g)].map((m) => m[1]!).filter((u) => u.startsWith(prefix));
    expect(urls.length).toBeGreaterThan(5);
    for (const url of urls) {
      let path = url.slice(prefix.length);
      if (path === "" || path.endsWith("/")) path += "index.html";
      expect(() => readFileSync(join(out, path)), url).not.toThrow();
    }
  });

  it("puts show notes HTML in content:encoded", () => {
    expect(xml).toContain("<content:encoded><![CDATA[<p>Wren and Osric open the workshop");
    expect(feed.items[1]!["content:encoded"]).toContain("<strong>dim-bulb tester</strong>");
  });

  it("is byte-for-byte reproducible", () => {
    const again = tempDir();
    build({ showDir: DEMO_SHOW, outDir: again });
    expect(readFileSync(join(again, "feed.xml"), "utf8")).toBe(xml);
  });
});

describe("RSS feed escaping and defaults", () => {
  it("escapes markup in titles and keeps CDATA valid", () => {
    const dir = fixture({
      "show.toml": MINIMAL_SHOW_TOML.replace('"Fixture Show"', '"Bits & <Bytes>"'),
      "episodes/one.md": episodeMd(
        `title: "Q&A: \\"Ask us\\" <live>"\ndate: 2026-05-01\nmedia: https://example.com/a.mp3?x=1&y=2\nlength: 100`,
        "Code sample: `a]]>b`",
      ),
    });
    const xml = renderFeed(createSite(loadShow(dir), "https://example.com/show/"));
    const { channel, items } = parseFeed(xml);
    expect(xml).toContain("<title>Bits &amp; &lt;Bytes&gt;</title>");
    expect(channel.title).toBe("Bits & <Bytes>");
    expect(items[0]!.title).toBe('Q&A: "Ask us" <live>');
    expect((items[0]!.enclosure as Node)["@url"]).toBe("https://example.com/a.mp3?x=1&y=2");
    expect(items[0]!["content:encoded"]).toContain("a]]&gt;b");
  });

  it("derives podcast:guid from the feed URL and uses page URLs as permalink guids", () => {
    const dir = fixture({
      "show.toml": MINIMAL_SHOW_TOML,
      "episodes/one.md": episodeMd(`title: One\ndate: 2026-05-01\nmedia: https://example.com/a.m4a\nlength: 100`),
    });
    const { channel, items } = parseFeed(renderFeed(createSite(loadShow(dir), "https://example.com/show")));
    expect(channel["podcast:guid"]).toMatch(/^[0-9a-f-]{36}$/);
    const guid = items[0]!.guid as Node;
    expect(guid["#text"]).toBe("https://example.com/show/episodes/one/");
    expect(guid["@isPermaLink"]).toBe("true");
    expect((items[0]!.enclosure as Node)["@type"]).toBe("audio/mp4");
    expect(channel["itunes:owner"]).toBeUndefined();
  });
});
