import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";

export interface FrontMatterResult {
  data: Record<string, unknown>;
  body: string;
  format: "yaml" | "toml" | "none";
}

const YAML_FENCE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const TOML_FENCE = /^\+\+\+[ \t]*\r?\n([\s\S]*?)\r?\n\+\+\+[ \t]*(?:\r?\n|$)/;

/**
 * Split a Markdown file into front matter and body.
 *
 * YAML front matter is fenced with `---`, TOML front matter with `+++`.
 * A file without a fence has empty data.
 */
export function parseFrontMatter(source: string): FrontMatterResult {
  const text = source.replace(/^﻿/, "");
  const yaml = YAML_FENCE.exec(text);
  if (yaml) {
    const data: unknown = parseYaml(yaml[1] ?? "") ?? {};
    return { data: asRecord(data, "YAML"), body: text.slice(yaml[0].length), format: "yaml" };
  }
  const toml = TOML_FENCE.exec(text);
  if (toml) {
    const data = parseToml(toml[1] ?? "");
    return { data: asRecord(data, "TOML"), body: text.slice(toml[0].length), format: "toml" };
  }
  return { data: {}, body: text, format: "none" };
}

function asRecord(value: unknown, kind: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${kind} front matter must be a mapping of keys to values`);
  }
  return value as Record<string, unknown>;
}
