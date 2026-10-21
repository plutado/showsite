import { extname } from "node:path";

const MEDIA_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/opus",
  ".flac": "audio/flac",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".m4v": "video/x-m4v",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m3u8": "application/vnd.apple.mpegurl",
};

const TRANSCRIPT_TYPES: Record<string, string> = {
  ".vtt": "text/vtt",
  ".srt": "application/x-subrip",
  ".json": "application/json",
  ".html": "text/html",
  ".htm": "text/html",
  ".txt": "text/plain",
};

const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
};

function extensionOf(pathOrUrl: string): string {
  let path = pathOrUrl;
  try {
    path = new URL(pathOrUrl).pathname;
  } catch {
    // Not a URL; treat as a file path.
  }
  return extname(path).toLowerCase();
}

export const mediaTypeFor = (url: string): string | undefined => MEDIA_TYPES[extensionOf(url)];
export const transcriptTypeFor = (path: string): string | undefined =>
  TRANSCRIPT_TYPES[extensionOf(path)];
export const imageTypeFor = (path: string): string | undefined => IMAGE_TYPES[extensionOf(path)];
