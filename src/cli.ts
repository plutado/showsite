#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { build } from "./build.js";
import { ShowsiteError } from "./errors.js";
import { VERSION } from "./version.js";

const HELP = `showsite ${VERSION}

Usage:
  showsite build <show-folder> [--out <folder>] [--base-url <url>] [--theme <folder>]

Options:
  -o, --out       Output folder (default: _site). It is emptied before each build.
  -b, --base-url  Absolute URL the site is served from. Overrides base_url in
                  show.toml. The SHOWSITE_BASE_URL environment variable also works.
  -t, --theme     Theme folder. Overrides theme in show.toml.
  -h, --help      Show this help.
  -v, --version   Print the version.
`;

export function main(argv: string[], env: NodeJS.ProcessEnv = process.env): number {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        out: { type: "string", short: "o" },
        "base-url": { type: "string", short: "b" },
        theme: { type: "string", short: "t" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n\n${HELP}`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.version) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  const [command, showDir, ...extra] = positionals;
  if (values.help || !command) {
    process.stdout.write(HELP);
    return values.help ? 0 : 2;
  }
  if (command !== "build" || !showDir || extra.length > 0) {
    process.stderr.write(`Unknown arguments: ${positionals.join(" ")}\n\n${HELP}`);
    return 2;
  }

  try {
    const baseUrl = values["base-url"] ?? (env.SHOWSITE_BASE_URL || undefined);
    const result = build({
      showDir,
      outDir: values.out ?? "_site",
      ...(baseUrl ? { baseUrl } : {}),
      ...(values.theme ? { themeDir: values.theme } : {}),
    });
    const n = result.site.episodes.length;
    process.stdout.write(
      `Built "${result.site.show.title}": ${n} episode${n === 1 ? "" : "s"}, ${result.files.length} files in ${result.outDir}\n` +
        `Feed: ${result.site.feedUrl}\n`,
    );
    return 0;
  } catch (err) {
    if (err instanceof ShowsiteError) {
      process.stderr.write(`error: ${err.message}\n`);
      return 1;
    }
    throw err;
  }
}

const invokedDirectly = (() => {
  try {
    return process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedDirectly) process.exitCode = main(process.argv.slice(2));
