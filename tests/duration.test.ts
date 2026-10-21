import { describe, expect, it } from "vitest";
import { formatDuration, humanDuration, parseDuration } from "../src/duration.js";

describe("parseDuration", () => {
  it("accepts seconds as a number or string", () => {
    expect(parseDuration(95)).toBe(95);
    expect(parseDuration("95")).toBe(95);
  });

  it("accepts MM:SS and HH:MM:SS", () => {
    expect(parseDuration("02:10")).toBe(130);
    expect(parseDuration("1:02:03")).toBe(3723);
    expect(parseDuration("00:00:01.5")).toBe(1.5);
  });

  it("rejects malformed values", () => {
    expect(parseDuration("1:75")).toBeUndefined();
    expect(parseDuration("abc")).toBeUndefined();
    expect(parseDuration("1:2:3:4")).toBeUndefined();
    expect(parseDuration(-1)).toBeUndefined();
    expect(parseDuration(undefined)).toBeUndefined();
  });
});

describe("formatDuration", () => {
  it("pads to HH:MM:SS", () => {
    expect(formatDuration(3723)).toBe("01:02:03");
    expect(formatDuration(59)).toBe("00:00:59");
  });

  it("uses MM:SS in short form under an hour", () => {
    expect(formatDuration(130, true)).toBe("02:10");
    expect(formatDuration(3723, true)).toBe("01:02:03");
  });
});

describe("humanDuration", () => {
  it("rounds to minutes", () => {
    expect(humanDuration(1795)).toBe("30 min");
    expect(humanDuration(3840)).toBe("1 h 4 min");
    expect(humanDuration(7200)).toBe("2 h");
    expect(humanDuration(10)).toBe("1 min");
  });
});
