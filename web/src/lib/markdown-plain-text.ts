import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

interface MdNode {
  type: string;
  value?: string;
  alt?: string | null;
  children?: MdNode[];
}

const INLINE = new Set(["text", "inlineCode", "emphasis", "strong", "delete", "link", "image", "break"]);

function toText(node: MdNode): string {
  if (node.type === "image") return node.alt ?? "";
  if (node.type === "break") return " ";
  if (node.value !== undefined) return node.value;
  if (!node.children) return "";
  const parts = node.children.map(toText).filter((p) => p !== "");
  // Blocks (paragraphs, list items, headings, ...) are joined with a space so
  // the words of consecutive blocks don't run together.
  const joiner = node.children.every((c) => INLINE.has(c.type)) ? "" : " ";
  return parts.join(joiner);
}

/** Strip Markdown syntax for one-line previews (e.g. line-clamped cards). */
export function markdownToPlainText(markdown: string): string {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as MdNode;
  return toText(tree).replace(/\s+/g, " ").trim();
}
