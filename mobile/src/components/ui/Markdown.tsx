import { useMemo, type ReactNode } from "react";
import { Linking, Platform, Text, View } from "react-native";
import type { Token, Tokens } from "marked";
import { isSafeUrl, parseMarkdown } from "@/lib/markdown";

/**
 * Renders a deliberately small Markdown subset (GFM) with RN primitives:
 * headings, paragraphs, bold/italic/strikethrough, inline + block code,
 * lists (incl. task lists), blockquotes, links, rules and simple tables.
 * Raw HTML is shown as literal text (same as the web renderer), and only
 * http(s)/mailto links can be opened.
 *
 * RN Text styles only cascade into nested Text, not through View, so every
 * block-level Text receives `textClassName` explicitly.
 */
export function Markdown({
  children,
  className,
  textClassName = "text-sm text-gray-700 dark:text-gray-300",
  testID,
}: {
  children: string;
  className?: string;
  textClassName?: string;
  testID?: string;
}) {
  const tokens = useMemo(() => parseMarkdown(children), [children]);
  return (
    <View className={className} testID={testID}>
      {renderBlocks(tokens, textClassName, "md")}
    </View>
  );
}

const monoStyle = { fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }) };
const linkClass = "text-blue-600 underline dark:text-blue-400";

const headingClass: Record<number, string> = {
  1: "text-xl font-bold",
  2: "text-lg font-semibold",
  3: "text-base font-semibold",
};

function openUrl(href: string) {
  if (isSafeUrl(href)) Linking.openURL(href.trim()).catch(() => {});
}

function renderBlocks(tokens: Token[], textClass: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  tokens.forEach((token, i) => {
    const key = `${keyPrefix}-${i}`;
    // Spacing between blocks, but not before the first one.
    const gap = nodes.length > 0 ? "mt-2" : "";
    switch (token.type) {
      case "space":
      case "def":
        return;
      case "heading":
        nodes.push(
          <Text key={key} role="heading" className={`${textClass} ${headingClass[token.depth] ?? "font-semibold"} ${nodes.length > 0 ? "mt-3" : ""}`}>
            {renderInline(token.tokens ?? [], key)}
          </Text>
        );
        return;
      case "paragraph":
        nodes.push(
          <Text key={key} className={`${textClass} ${gap}`}>
            {renderInline(token.tokens ?? [], key)}
          </Text>
        );
        return;
      case "text": {
        // Block-level text appears inside tight list items.
        const t = token as Tokens.Text;
        nodes.push(
          <Text key={key} className={`${textClass} ${gap}`}>
            {t.tokens ? renderInline(t.tokens, key) : t.text}
          </Text>
        );
        return;
      }
      case "list": {
        const list = token as Tokens.List;
        const start = typeof list.start === "number" ? list.start : 1;
        nodes.push(
          <View key={key} className={`${gap} gap-1`}>
            {list.items.map((item, j) => {
              const itemKey = `${key}-${j}`;
              const marker = item.task ? (item.checked ? "☑" : "☐") : list.ordered ? `${start + j}.` : "•";
              const body = item.tokens.filter((c) => c.type !== "checkbox");
              return (
                <View key={itemKey} className="flex-row">
                  <Text className={`${textClass} w-5`}>{marker}</Text>
                  <View className="flex-1">{renderBlocks(body, textClass, itemKey)}</View>
                </View>
              );
            })}
          </View>
        );
        return;
      }
      case "blockquote":
        nodes.push(
          <View key={key} className={`${gap} border-l-4 border-gray-300 pl-3 dark:border-gray-600`}>
            {renderBlocks(token.tokens ?? [], `${textClass} italic`, key)}
          </View>
        );
        return;
      case "code":
        nodes.push(
          <View key={key} className={`${gap} rounded-md bg-gray-100 p-3 dark:bg-gray-800`}>
            <Text className={textClass} style={monoStyle}>
              {token.text}
            </Text>
          </View>
        );
        return;
      case "hr":
        nodes.push(<View key={key} className="my-3 h-px bg-gray-200 dark:bg-gray-700" />);
        return;
      case "table": {
        const table = token as Tokens.Table;
        const row = (cells: Tokens.TableCell[], rowKey: string, header: boolean) => (
          <View key={rowKey} className="flex-row border-b border-gray-200 dark:border-gray-700">
            {cells.map((cell, c) => (
              <Text key={`${rowKey}-${c}`} className={`${textClass} flex-1 px-1 py-1 ${header ? "font-semibold" : ""}`}>
                {renderInline(cell.tokens, `${rowKey}-${c}`)}
              </Text>
            ))}
          </View>
        );
        nodes.push(
          <View key={key} className={gap}>
            {row(table.header, `${key}-h`, true)}
            {table.rows.map((r, j) => row(r, `${key}-${j}`, false))}
          </View>
        );
        return;
      }
      default:
        // html blocks and anything unforeseen: show the source text as-is.
        if ("text" in token && typeof token.text === "string" && token.text.trim()) {
          nodes.push(
            <Text key={key} className={`${textClass} ${gap}`}>
              {token.text.trim()}
            </Text>
          );
        }
    }
  });
  return nodes;
}

function renderInline(tokens: Token[], keyPrefix: string): ReactNode[] {
  return tokens.map((token, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (token.type) {
      case "strong":
        return <Text key={key} className="font-bold">{renderInline(token.tokens ?? [], key)}</Text>;
      case "em":
        return <Text key={key} className="italic">{renderInline(token.tokens ?? [], key)}</Text>;
      case "del":
        return <Text key={key} className="line-through">{renderInline(token.tokens ?? [], key)}</Text>;
      case "codespan":
        return (
          <Text key={key} className="bg-gray-100 dark:bg-gray-800" style={monoStyle}>
            {token.text}
          </Text>
        );
      case "br":
        return "\n";
      case "link": {
        const link = token as Tokens.Link;
        const children = renderInline(link.tokens, key);
        if (!isSafeUrl(link.href)) return <Text key={key}>{children}</Text>;
        return (
          <Text key={key} className={linkClass} role="link" onPress={() => openUrl(link.href)}>
            {children}
          </Text>
        );
      }
      case "image": {
        // Shown as a link for now: rendering arbitrary external images would let
        // any author track who views their (public) exercise.
        const image = token as Tokens.Image;
        const label = `🖼 ${image.text || image.href}`;
        if (!isSafeUrl(image.href)) return <Text key={key}>{label}</Text>;
        return (
          <Text key={key} className={linkClass} role="link" onPress={() => openUrl(image.href)}>
            {label}
          </Text>
        );
      }
      case "text": {
        const t = token as Tokens.Text;
        return t.tokens ? <Text key={key}>{renderInline(t.tokens, key)}</Text> : t.text;
      }
      default:
        // escape, inline html, ...: literal text
        return "text" in token && typeof token.text === "string" ? token.text : null;
    }
  });
}
