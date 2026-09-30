import { insertImageMarkdown, ownImageUrl } from "@/lib/uploaded-images";

const URL_PATH = "/static/exercise_images/0123456789abcdef0123456789abcdef.webp";

describe("insertImageMarkdown", () => {
  it.each([
    ["", 0, 0, `![Bild](${URL_PATH})\n\n`],
    ["Hang.", 5, 5, `Hang.\n\n![Bild](${URL_PATH})\n\n`],
    ["Hang.\n\nPull.", 5, 5, `Hang.\n\n![Bild](${URL_PATH})\n\nPull.`],
    ["Hang.\nPull.", 6, 6, `Hang.\n\n![Bild](${URL_PATH})\n\nPull.`],
    ["A XX B", 2, 4, `A \n\n![Bild](${URL_PATH})\n\n B`],
  ])("%j at %i-%i", (text, start, end, expected) => {
    expect(insertImageMarkdown(text, start, end, "Bild", URL_PATH).text).toBe(expected);
  });

  it("returns the cursor position right after the inserted image", () => {
    const { text, cursor } = insertImageMarkdown("Hang.\n\nPull.", 5, 5, "Bild", URL_PATH);
    // Existing blank lines after the insertion point are kept, not duplicated.
    expect(text.slice(0, cursor)).toBe(`Hang.\n\n![Bild](${URL_PATH})`);
    expect(text.slice(cursor)).toBe("\n\nPull.");
  });

  it("strips characters from the alt text that would break the syntax", () => {
    expect(insertImageMarkdown("", 0, 0, "a]b[c\\d", URL_PATH).text).toBe(`![abcd](${URL_PATH})\n\n`);
  });
});

describe("ownImageUrl", () => {
  it("resolves our own uploads against the API origin", () => {
    expect(ownImageUrl(URL_PATH)).toBe(`https://api.test.local${URL_PATH}`);
  });

  it.each([
    "https://evil.example/x.png",
    "//evil.example/static/exercise_images/0123456789abcdef0123456789abcdef.webp",
    "/static/exercise_images/../profile_pics/a.webp",
    "/static/profile_pics/0123456789abcdef0123456789abcdef.webp",
    "/static/exercise_images/0123456789ABCDEF0123456789ABCDEF.webp",
    "",
  ])("rejects %j", (src) => {
    expect(ownImageUrl(src)).toBeNull();
  });
});
