import { Lexer, type Token } from "marked";

// Jest note: package.json maps "marked" to its prebuilt UMD file instead of
// letting Babel transform the ESM build. jest-expo's Babel config rewrites
// named regex groups and renumbers marked's `\k<b>` backreference to the
// wrong group, which breaks inline parsing after `code` spans. The Metro/Hermes
// app bundle keeps the regex untouched and is not affected.

/**
 * Parse Markdown into marked's token tree (GFM is on by default). Parsing only,
 * never HTML output. Note: `new Lexer(opts)` would *replace* marked's defaults
 * instead of merging them, so the static helper is used.
 */
export function parseMarkdown(markdown: string): Token[] {
  return Lexer.lex(markdown);
}

/** Only these URL schemes may be opened from rendered Markdown. */
export function isSafeUrl(href: string | undefined | null): href is string {
  return !!href && /^(https?:|mailto:)/i.test(href.trim());
}

const INLINE = new Set(["text", "strong", "em", "del", "codespan", "link", "image", "escape", "html", "br", "checkbox"]);

function tokenToText(token: Token): string {
  switch (token.type) {
    case "space":
    case "hr":
    case "def":
    case "checkbox":
      return "";
    case "br":
      return " ";
    case "image":
      return token.text ?? "";
    case "list":
      return (token.items as Token[]).map(tokenToText).join(" ");
    case "table": {
      const cells = [...token.header, ...token.rows.flat()] as { text: string }[];
      return cells.map((c) => c.text).join(" ");
    }
  }
  if ("tokens" in token && Array.isArray(token.tokens)) {
    const children = token.tokens as Token[];
    // Blocks are joined with a space so consecutive blocks don't run together.
    const joiner = children.every((c) => INLINE.has(c.type)) ? "" : " ";
    return children.map(tokenToText).filter((p) => p !== "").join(joiner);
  }
  return "text" in token && typeof token.text === "string" ? token.text : "";
}

/** Strip Markdown syntax for one-line previews (e.g. cards with numberOfLines). */
export function markdownToPlainText(markdown: string): string {
  return parseMarkdown(markdown).map(tokenToText).filter((p) => p !== "").join(" ").replace(/\s+/g, " ").trim();
}
