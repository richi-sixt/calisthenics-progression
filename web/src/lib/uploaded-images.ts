const API_BASE = process.env.NEXT_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

/** Exactly the paths the backend's /uploads/images endpoint hands out. */
const OWN_IMAGE_PATH = /^\/static\/exercise_images\/[0-9a-f]{32}\.webp$/;

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Absolute URL for an image uploaded to our own API, or null for anything
 * else. Only these are rendered inline; external images stay links so an
 * author can't track who views their exercise.
 */
export function ownImageUrl(src: string | null | undefined): string | null {
  return src && OWN_IMAGE_PATH.test(src) ? `${API_BASE}${src}` : null;
}

/**
 * Insert `![alt](url)` at the selection, on its own line (blank lines around
 * it so it doesn't merge into the surrounding paragraph). Replaces any
 * selected text. Returns the new text and the cursor position after the image.
 */
export function insertImageMarkdown(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  alt: string,
  url: string
): { text: string; cursor: number } {
  const before = text.slice(0, selectionStart);
  const after = text.slice(selectionEnd);
  const safeAlt = alt.replace(/[[\]\\]/g, "");
  const prefix = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const suffix = after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const snippet = `${prefix}![${safeAlt}](${url})${suffix}`;
  return { text: before + snippet + after, cursor: before.length + snippet.length };
}
