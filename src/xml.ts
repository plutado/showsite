const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/** Escape text for use in XML element content or attribute values. */
export function escapeXml(value: unknown): string {
  return String(value)
    // Characters that are not allowed anywhere in XML 1.0.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/[&<>"']/g, (c) => XML_ESCAPES[c] ?? c);
}

/** Wrap text in a CDATA section, splitting any "]]>" so the section stays valid. */
export function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

type AttrValue = string | number | boolean | undefined | null;

/** Build an element. `children` is raw XML; pass escaped text or nested elements. */
export function el(name: string, attrs: Record<string, AttrValue> = {}, children?: string): string {
  const attrText = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
    .join("");
  if (children === undefined || children === "") return `<${name}${attrText}/>`;
  return `<${name}${attrText}>${children}</${name}>`;
}

/** Build an element whose content is escaped text. Returns "" when the value is empty. */
export function textEl(name: string, value: unknown, attrs: Record<string, AttrValue> = {}): string {
  if (value === undefined || value === null || value === "") return "";
  return el(name, attrs, escapeXml(value));
}
