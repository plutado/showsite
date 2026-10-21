import { ShowsiteError } from "./errors.js";

/** Normalize a base URL: absolute http(s), ending in a slash. */
export function normalizeBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ShowsiteError(`Base URL is not an absolute URL: ${value}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ShowsiteError(`Base URL must use http or https: ${value}`);
  }
  url.search = "";
  url.hash = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.toString();
}

export interface SiteUrls {
  /** Absolute base URL, ending in "/". */
  base: string;
  /** Path part of the base URL, ending in "/", used for links inside pages. */
  basePath: string;
  /** Absolute URL for a site-relative path. */
  abs(path: string): string;
  /** Root-relative URL (starting with the base path) for a site-relative path. */
  rel(path: string): string;
}

export function siteUrls(baseUrl: string): SiteUrls {
  const base = normalizeBaseUrl(baseUrl);
  const basePath = new URL(base).pathname;
  const clean = (path: string) => path.replace(/^\/+/, "");
  return {
    base,
    basePath,
    abs: (path) => new URL(clean(path), base).toString(),
    rel: (path) => basePath + clean(path),
  };
}

export const isAbsoluteUrl = (value: string): boolean => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
