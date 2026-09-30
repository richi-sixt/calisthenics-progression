import { isSafeUrl, markdownToPlainText } from "@/lib/markdown";

describe("markdownToPlainText", () => {
  it.each([
    ["Plain old description.", "Plain old description."],
    ["# Setup\n\nHang from the **bar**, *squeeze* glutes.", "Setup Hang from the bar, squeeze glutes."],
    ["- one\n- two\n\n1. a\n2. b", "one two a b"],
    ["- [x] done\n- [ ] todo", "done todo"],
    ["See [video](https://x.y) and ![start position](/img.png)", "See video and start position"],
    ["Line one\nline two", "Line one line two"],
    ["`hollow` ~~bad~~\n\n> quote", "hollow bad quote"],
    ["| a | b |\n|---|---|\n| 1 | 2 |", "a b 1 2"],
    ["A & B <b>x</b>", "A & B <b>x</b>"],
  ])("%j -> %j", (input, expected) => {
    expect(markdownToPlainText(input)).toBe(expected);
  });
});

describe("isSafeUrl", () => {
  it.each([
    ["https://example.com", true],
    ["http://example.com", true],
    ["mailto:a@b.c", true],
    [" HTTPS://EXAMPLE.COM ", true],
    ["javascript:alert(1)", false],
    ["file:///etc/passwd", false],
    ["/relative/path", false],
    ["", false],
    [undefined, false],
  ])("%j -> %s", (url, expected) => {
    expect(isSafeUrl(url)).toBe(expected);
  });
});
