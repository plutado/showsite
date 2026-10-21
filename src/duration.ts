/**
 * Parse a duration or timestamp into whole seconds.
 *
 * Accepts a number of seconds, or a string in "SS", "MM:SS" or "HH:MM:SS"
 * form. Fractional seconds are allowed ("01:02.5"). Returns undefined for
 * anything else.
 */
export function parseDuration(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!/^\d+(:\d{1,2}){0,2}(\.\d+)?$/.test(trimmed)) return undefined;
  const parts = trimmed.split(":").map(Number);
  let seconds = 0;
  for (const part of parts) seconds = seconds * 60 + part;
  // Minutes and seconds fields after the first must be below 60.
  if (parts.slice(1).some((p) => p >= 60)) return undefined;
  return seconds;
}

/** Format seconds as "HH:MM:SS", or "MM:SS" when shorter than an hour and `short` is set. */
export function formatDuration(totalSeconds: number, short = false): string {
  const whole = Math.floor(totalSeconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (short && h === 0) return `${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** A human label such as "1 h 4 min" or "38 min". */
export function humanDuration(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${Math.max(minutes, 1)} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
