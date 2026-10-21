import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEMO_SHOW = join(ROOT, "examples", "demo-show");

export function tempDir(prefix = "showsite-test-"): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Write a set of files (path -> content) into a new temporary folder. */
export function fixture(files: Record<string, string>): string {
  const dir = tempDir("showsite-fixture-");
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

export const MINIMAL_SHOW_TOML = `
title = "Fixture Show"
author = "Test Author"
description = "A show used in tests."
artwork = "https://example.com/art.png"
base_url = "https://example.com/show/"
`;

export function episodeMd(front: string, body = "Notes."): string {
  return `---\n${front.trim()}\n---\n\n${body}\n`;
}
