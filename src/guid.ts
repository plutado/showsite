import { createHash } from "node:crypto";

/** Namespace UUID defined by the Podcasting 2.0 spec for podcast:guid. */
export const PODCAST_GUID_NAMESPACE = "ead4c236-bf58-58c6-a2c6-a6b28d128cb6";

/** RFC 4122 version 5 (SHA-1, name-based) UUID. */
export function uuidv5(name: string, namespace: string): string {
  const ns = Buffer.from(namespace.replace(/-/g, ""), "hex");
  if (ns.length !== 16) throw new Error(`Invalid namespace UUID: ${namespace}`);
  const hash = createHash("sha1").update(ns).update(name, "utf8").digest();
  hash[6] = ((hash[6] ?? 0) & 0x0f) | 0x50;
  hash[8] = ((hash[8] ?? 0) & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * The podcast:guid for a feed URL: a v5 UUID of the URL with the scheme and
 * trailing slashes removed, in the Podcasting 2.0 namespace.
 */
export function podcastGuid(feedUrl: string): string {
  const name = feedUrl.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/+$/, "");
  return uuidv5(name, PODCAST_GUID_NAMESPACE);
}
