import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { chaptersJson } from "./chapters.js";
import { ShowsiteError } from "./errors.js";
import { renderFeed } from "./feed.js";
import { loadShow } from "./load.js";
import { DEFAULT_THEME_DIR, renderPages } from "./render.js";
import { createSite, type Site } from "./site.js";
import { renderSitemap } from "./sitemap.js";
import { isAbsoluteUrl } from "./urls.js";

export interface BuildOptions {
  /** Show folder containing show.toml. */
  showDir: string;
  /** Output folder. It is emptied first unless `clean` is false. */
  outDir: string;
  /** Overrides base_url in show.toml. */
  baseUrl?: string;
  /** Overrides the theme in show.toml. */
  themeDir?: string;
  clean?: boolean;
}

export interface BuildResult {
  site: Site;
  outDir: string;
  /** Written files, relative to outDir, in write order. */
  files: string[];
}

/** Load a show and write the complete static site. */
export function build(options: BuildOptions): BuildResult {
  const show = loadShow(options.showDir);
  const baseUrl = options.baseUrl ?? show.baseUrl;
  if (!baseUrl) {
    throw new ShowsiteError(
      "No base URL. Set base_url in show.toml, pass --base-url, or set SHOWSITE_BASE_URL.",
    );
  }
  const site = createSite(show, baseUrl);
  const themeDir = options.themeDir ? resolve(options.themeDir) : (show.themeDir ?? DEFAULT_THEME_DIR);
  const outDir = resolve(options.outDir);
  const contains = (parent: string, child: string) => child === parent || child.startsWith(parent.endsWith(sep) ? parent : parent + sep);
  if (contains(outDir, show.dir) || contains(show.dir, outDir)) {
    throw new ShowsiteError("The output folder must be outside the show folder, and must not contain it.");
  }
  if (options.clean !== false && contains(outDir, process.cwd())) {
    throw new ShowsiteError(`Refusing to empty ${outDir}: it contains the current folder.`);
  }

  const pages = renderPages(site, themeDir);

  if (options.clean !== false) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const files: string[] = [];
  const write = (path: string, content: string) => {
    const full = join(outDir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
    files.push(path);
  };
  const copy = (from: string, path: string) => {
    const full = join(outDir, path);
    mkdirSync(dirname(full), { recursive: true });
    copyFileSync(from, full);
    files.push(path);
  };

  for (const page of pages) write(page.path, page.html);
  write(site.feedPath, renderFeed(site));
  write("sitemap.xml", renderSitemap(site));
  // GitHub Pages: serve files as-is, without Jekyll processing.
  write(".nojekyll", "");

  if (site.artworkPath) copy(resolve(show.dir, show.artwork), site.artworkPath);

  for (const out of site.episodes) {
    const e = out.episode;
    if (out.chaptersPath) write(out.chaptersPath, JSON.stringify(chaptersJson(site, out), null, 2) + "\n");
    if (out.transcriptPath && e.transcript) copy(e.transcript.sourcePath, out.transcriptPath);
    if (e.image && !isAbsoluteUrl(e.image)) copy(resolve(show.dir, e.image), `${out.dir}${basename(e.image)}`);
  }

  const assets = join(themeDir, "assets");
  if (existsSync(assets)) {
    cpSync(assets, join(outDir, "assets"), { recursive: true });
    files.push("assets/");
  }

  return { site, outDir, files };
}
