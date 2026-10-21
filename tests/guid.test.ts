import { describe, expect, it } from "vitest";
import { podcastGuid, uuidv5 } from "../src/guid.js";

describe("uuidv5", () => {
  it("matches a reference implementation for the DNS namespace", () => {
    // Same value as Python: uuid.uuid5(uuid.NAMESPACE_DNS, "www.example.com").
    expect(uuidv5("www.example.com", "6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(
      "2ed6657d-e927-568b-95e1-2665a8aea6a2",
    );
  });
});

describe("podcastGuid", () => {
  it("matches the example in the Podcasting 2.0 guid documentation", () => {
    expect(podcastGuid("https://mp3s.nashownotes.com/pc20rss.xml")).toBe("917393e3-1b1e-5cef-ace4-edaa54e1f810");
  });

  it("ignores the scheme and trailing slashes", () => {
    const a = podcastGuid("https://example.com/feed/");
    expect(podcastGuid("http://example.com/feed")).toBe(a);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
