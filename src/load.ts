import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path";
import { Marked } from "marked";
import { parse as parseToml } from "smol-toml";
import { parseDuration } from "./duration.js";
import { ShowsiteError } from "./errors.js";
import { parseFrontMatter } from "./frontmatter.js";
import { mediaTypeFor, transcriptTypeFor } from "./media.js";
import type {
  Category,
  Chapter,
  Episode,
  EpisodeType,
  Link,
  Owner,
  Person,
  Show,
  ShowType,
  Transcript,
} from "./types.js";
import { isAbsoluteUrl } from "./urls.js";

const markdown = new Marked({ gfm: true, async: false });

/** Collects problems so a build reports every content error at once. */
class Problems {
  readonly list: string[] = [];
  add(where: string, message: string): void {
    this.list.push(`${where}: ${message}`);
  }
}

type Data = Record<string, unknown>;

const isRecord = (v: unknown): v is Data => v !== null && typeof v === "object" && !Array.isArray(v);

function str(data: Data, key: string): string | undefined {
  const v = data[key];
  if (typeof v === "string") return v.trim() === "" ? undefined : v.trim();
  if (typeof v === "number") return String(v);
  return undefined;
}

function int(data: Data, key: string, where: string, problems: Problems): number | undefined {
  const v = data[key];
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0) {
    problems.add(where, `"${key}" must be a whole number, got ${JSON.stringify(v)}`);
    return undefined;
  }
  return n;
}

function bool(data: Data, key: string): boolean | undefined {
  const v = data[key];
  if (typeof v === "boolean") return v;
  if (v === "yes" || v === "true") return true;
  if (v === "no" || v === "false" || v === "clean") return false;
  return undefined;
}

function links(value: unknown, where: string, problems: Problems): Link[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    problems.add(where, `"links" must be a list of { title, url }`);
    return [];
  }
  const out: Link[] = [];
  for (const item of value) {
    if (isRecord(item) && str(item, "title") && str(item, "url")) {
      out.push({ title: str(item, "title")!, url: str(item, "url")! });
    } else {
      problems.add(where, `each link needs "title" and "url", got ${JSON.stringify(item)}`);
    }
  }
  return out;
}

function people(value: unknown, defaultRole: string, key: string, where: string, problems: Problems): Person[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    problems.add(where, `"${key}" must be a list`);
    return [];
  }
  const out: Person[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      out.push({ name: item.trim(), role: defaultRole });
    } else if (isRecord(item) && str(item, "name")) {
      const person: Person = { name: str(item, "name")!, role: (str(item, "role") ?? defaultRole).toLowerCase() };
      const href = str(item, "href");
      const img = str(item, "img");
      if (href) person.href = href;
      if (img) person.img = img;
      out.push(person);
    } else {
      problems.add(where, `each entry in "${key}" needs a "name", got ${JSON.stringify(item)}`);
    }
  }
  return out;
}

function categories(value: unknown, where: string, problems: Problems): Category[] {
  if (value === undefined) return [];
  const list = typeof value === "string" ? [value] : value;
  if (!Array.isArray(list)) {
    problems.add(where, `"categories" must be a list of strings like "Science > Earth Sciences"`);
    return [];
  }
  const out: Category[] = [];
  for (const item of list) {
    if (typeof item !== "string" || !item.trim()) {
      problems.add(where, `category must be a string, got ${JSON.stringify(item)}`);
      continue;
    }
    const [name, sub, ...rest] = item.split(/\s*(?:>|\/)\s*/).map((s) => s.trim());
    if (!name || rest.length > 0) {
      problems.add(where, `category "${item}" must have at most two levels`);
      continue;
    }
    out.push(sub ? { name, sub } : { name });
  }
  return out;
}

function chapters(value: unknown, where: string, problems: Problems): Chapter[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    problems.add(where, `"chapters" must be a list of { start, title }`);
    return [];
  }
  const out: Chapter[] = [];
  for (const item of value) {
    if (!isRecord(item) || !str(item, "title")) {
      problems.add(where, `each chapter needs "start" and "title", got ${JSON.stringify(item)}`);
      continue;
    }
    const start = parseDuration(item.start);
    if (start === undefined) {
      problems.add(where, `chapter "${str(item, "title")}" has an invalid start ${JSON.stringify(item.start)}`);
      continue;
    }
    const chapter: Chapter = { start, title: str(item, "title")! };
    const url = str(item, "url");
    const img = str(item, "img");
    if (url) chapter.url = url;
    if (img) chapter.img = img;
    out.push(chapter);
  }
  for (let i = 1; i < out.length; i++) {
    if (out[i]!.start <= out[i - 1]!.start) {
      problems.add(where, `chapters must be in increasing start order ("${out[i]!.title}")`);
      break;
    }
  }
  return out;
}

function parseDate(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value.trim());
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

/** First paragraph of rendered HTML as plain text, used when no summary is given. */
function firstParagraphText(html: string): string {
  const match = /<p>([\s\S]*?)<\/p>/.exec(html);
  if (!match?.[1]) return "";
  return match[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function loadEpisode(show: Pick<Show, "dir" | "language">, file: string, problems: Problems): Episode | undefined {
  const where = relative(show.dir, file);
  let parsed;
  try {
    parsed = parseFrontMatter(readFileSync(file, "utf8"));
  } catch (err) {
    problems.add(where, `could not parse front matter: ${(err as Error).message}`);
    return undefined;
  }
  const data = parsed.data;
  if (bool(data, "draft") === true) return undefined;

  const before = problems.list.length;
  const title = str(data, "title");
  if (!title) problems.add(where, `"title" is required`);

  const slug = str(data, "slug") ?? basename(file, extname(file)).toLowerCase();
  if (!SLUG_RE.test(slug)) {
    problems.add(where, `slug "${slug}" may only contain lowercase letters, digits and hyphens`);
  }

  const date = parseDate(data.date);
  if (!date) problems.add(where, `"date" is required and must be a date such as 2026-09-01 or 2026-09-01T09:00:00Z`);

  const media = str(data, "media");
  if (!media) problems.add(where, `"media" (the audio or video URL) is required`);
  else if (!isAbsoluteUrl(media)) problems.add(where, `"media" must be an absolute URL, got "${media}"`);

  const mediaType = str(data, "media_type") ?? (media ? mediaTypeFor(media) : undefined);
  if (media && !mediaType) problems.add(where, `cannot tell the media type of "${media}"; set "media_type"`);

  const length = int(data, "length", where, problems);
  if (length === undefined && data.length === undefined) {
    problems.add(where, `"length" (media file size in bytes) is required for the RSS enclosure`);
  }

  let duration: number | undefined;
  if (data.duration !== undefined) {
    duration = parseDuration(data.duration);
    if (duration === undefined) problems.add(where, `"duration" must be seconds or HH:MM:SS, got ${JSON.stringify(data.duration)}`);
  }

  const episodeType = (str(data, "episode_type") ?? "full") as EpisodeType;
  if (!["full", "trailer", "bonus"].includes(episodeType)) {
    problems.add(where, `"episode_type" must be full, trailer or bonus`);
  }

  let transcript: Transcript | undefined;
  const transcriptPath = str(data, "transcript");
  if (transcriptPath) {
    const sourcePath = resolve(show.dir, transcriptPath);
    const type = str(data, "transcript_type") ?? transcriptTypeFor(sourcePath);
    if (!existsSync(sourcePath)) problems.add(where, `transcript file not found: ${transcriptPath}`);
    else if (!type) problems.add(where, `cannot tell the transcript type of "${transcriptPath}"; set "transcript_type"`);
    else {
      transcript = {
        sourcePath,
        fileName: `transcript${extname(sourcePath).toLowerCase()}`,
        type,
        language: str(data, "transcript_language") ?? show.language,
      };
    }
  }

  const image = str(data, "image");
  if (image && !isAbsoluteUrl(image) && !existsSync(resolve(show.dir, image))) {
    problems.add(where, `image file not found: ${image}`);
  }

  const html = markdown.parse(parsed.body) as string;
  const episode: Episode = {
    sourcePath: file,
    slug,
    title: title ?? "",
    date: date ?? new Date(0),
    media: media ?? "",
    mediaType: mediaType ?? "",
    length: length ?? 0,
    episodeType,
    summary: str(data, "summary") ?? str(data, "description") ?? firstParagraphText(html),
    html,
    guests: people(data.guests, "guest", "guests", where, problems),
    chapters: chapters(data.chapters, where, problems),
    links: links(data.links, where, problems),
  };
  const number = int(data, "number", where, problems);
  const season = int(data, "season", where, problems);
  const explicit = bool(data, "explicit");
  const guid = str(data, "guid");
  if (number !== undefined) episode.number = number;
  if (season !== undefined) episode.season = season;
  if (duration !== undefined) episode.duration = duration;
  if (explicit !== undefined) episode.explicit = explicit;
  if (image) episode.image = image;
  if (guid) episode.guid = guid;
  if (transcript) episode.transcript = transcript;

  return problems.list.length === before ? episode : undefined;
}

/**
 * Load a show folder: `show.toml` plus `episodes/*.md`.
 *
 * Throws a ShowsiteError listing every problem found.
 */
export function loadShow(dirInput: string): Show {
  const dir = resolve(dirInput);
  const configPath = join(dir, "show.toml");
  if (!existsSync(configPath)) throw new ShowsiteError(`No show.toml found in ${dir}`);

  let data: Data;
  try {
    data = parseToml(readFileSync(configPath, "utf8")) as Data;
  } catch (err) {
    throw new ShowsiteError(`Could not parse ${configPath}: ${(err as Error).message}`);
  }

  const problems = new Problems();
  const where = "show.toml";
  const title = str(data, "title");
  const author = str(data, "author");
  const description = str(data, "description");
  const artwork = str(data, "artwork");
  if (!title) problems.add(where, `"title" is required`);
  if (!author) problems.add(where, `"author" is required`);
  if (!description) problems.add(where, `"description" is required`);
  if (!artwork) problems.add(where, `"artwork" is required (a path in the show folder or an absolute URL)`);
  else if (!isAbsoluteUrl(artwork) && !existsSync(resolve(dir, artwork))) {
    problems.add(where, `artwork file not found: ${artwork}`);
  }

  const type = (str(data, "type") ?? "episodic") as ShowType;
  if (type !== "episodic" && type !== "serial") problems.add(where, `"type" must be episodic or serial`);

  let owner: Owner | undefined;
  if (data.owner !== undefined) {
    if (isRecord(data.owner) && str(data.owner, "name") && str(data.owner, "email")) {
      owner = { name: str(data.owner, "name")!, email: str(data.owner, "email")! };
    } else {
      problems.add(where, `[owner] needs "name" and "email"`);
    }
  }

  let themeDir: string | undefined;
  const theme = str(data, "theme");
  if (theme) {
    themeDir = isAbsolute(theme) ? theme : resolve(dir, theme);
    if (!existsSync(themeDir) || !statSync(themeDir).isDirectory()) problems.add(where, `theme folder not found: ${theme}`);
  }

  const show: Show = {
    dir,
    title: title ?? "",
    author: author ?? "",
    description: description ?? "",
    language: str(data, "language") ?? "en",
    artwork: artwork ?? "",
    categories: categories(data.categories, where, problems),
    explicit: bool(data, "explicit") ?? false,
    type,
    medium: str(data, "medium") ?? "podcast",
    hosts: people(data.hosts, "host", "hosts", where, problems),
    links: links(data.links, where, problems),
    episodes: [],
  };
  if (owner) show.owner = owner;
  const copyright = str(data, "copyright");
  const guid = str(data, "guid");
  const baseUrl = str(data, "base_url");
  const locked = bool(data, "locked");
  if (locked !== undefined) show.locked = locked;
  if (copyright) show.copyright = copyright;
  if (guid) show.guid = guid;
  if (baseUrl) show.baseUrl = baseUrl;
  if (themeDir) show.themeDir = themeDir;

  const episodesDir = join(dir, "episodes");
  const files = existsSync(episodesDir)
    ? readdirSync(episodesDir)
        .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
        .sort()
        .map((f) => join(episodesDir, f))
    : [];

  const seen = new Map<string, string>();
  for (const file of files) {
    const episode = loadEpisode(show, file, problems);
    if (!episode) continue;
    const other = seen.get(episode.slug);
    if (other) problems.add(relative(dir, file), `slug "${episode.slug}" is also used by ${other}`);
    seen.set(episode.slug, relative(dir, file));
    show.episodes.push(episode);
  }

  if (problems.list.length > 0) {
    throw new ShowsiteError(`Found ${problems.list.length} problem(s) in ${dir}`, problems.list);
  }

  // Newest first, ties broken by episode number then slug, so output is stable.
  show.episodes.sort(
    (a, b) =>
      b.date.getTime() - a.date.getTime() ||
      (b.number ?? 0) - (a.number ?? 0) ||
      a.slug.localeCompare(b.slug),
  );
  return show;
}
