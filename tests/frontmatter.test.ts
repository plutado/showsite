import { describe, expect, it } from "vitest";
import { parseFrontMatter } from "../src/frontmatter.js";

describe("parseFrontMatter", () => {
  it("parses YAML front matter", () => {
    const r = parseFrontMatter("---\ntitle: Hello\nnumber: 2\n---\nBody text\n");
    expect(r.format).toBe("yaml");
    expect(r.data).toEqual({ title: "Hello", number: 2 });
    expect(r.body).toBe("Body text\n");
  });

  it("parses TOML front matter", () => {
    const r = parseFrontMatter('+++\ntitle = "Hello"\n[[chapters]]\nstart = "00:00"\ntitle = "Intro"\n+++\nBody');
    expect(r.format).toBe("toml");
    expect(r.data.title).toBe("Hello");
    expect(r.data.chapters).toEqual([{ start: "00:00", title: "Intro" }]);
    expect(r.body).toBe("Body");
  });

  it("treats a file without a fence as body only", () => {
    expect(parseFrontMatter("Just text")).toEqual({ data: {}, body: "Just text", format: "none" });
  });

  it("rejects front matter that is not a mapping", () => {
    expect(() => parseFrontMatter("---\n- a\n- b\n---\n")).toThrow(/mapping/);
  });
});
