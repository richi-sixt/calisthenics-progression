import { Linking } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { Markdown } from "@/components/ui/Markdown";

describe("Markdown", () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  afterEach(() => {
    openURL.mockRestore();
  });

  it("renders headings, emphasis and lists as text without markdown syntax", async () => {
    const { getByText, getAllByText, queryByText } = await render(
      <Markdown>{"# Setup\n\nHang from the **bar**.\n\n- one\n- two\n\n3. third"}</Markdown>
    );

    expect(getByText("Setup")).toBeTruthy();
    expect(getByText("bar")).toBeTruthy();
    expect(getByText("one")).toBeTruthy();
    expect(getAllByText("•")).toHaveLength(2);
    // Ordered lists keep their start number.
    expect(getByText("3.")).toBeTruthy();
    expect(queryByText(/\*\*/)).toBeNull();
    expect(queryByText(/^#/)).toBeNull();
  });

  it("opens safe links on press", async () => {
    const { getByText } = await render(<Markdown>{"Watch [the video](https://example.com/v)"}</Markdown>);

    await fireEvent.press(getByText("the video"));
    expect(openURL).toHaveBeenCalledWith("https://example.com/v");
  });

  it("renders unsafe links as plain, non-pressable text", async () => {
    const { getByText } = await render(<Markdown>{"[click](javascript:alert(1))"}</Markdown>);

    const node = getByText("click");
    expect(node.props.onPress).toBeUndefined();
    expect(openURL).not.toHaveBeenCalled();
  });

  it("shows images as a labelled link instead of loading them", async () => {
    const { getByText } = await render(<Markdown>{"![Start position](https://example.com/a.png)"}</Markdown>);

    await fireEvent.press(getByText("🖼 Start position"));
    expect(openURL).toHaveBeenCalledWith("https://example.com/a.png");
  });

  it("renders our own uploaded images inline, splitting the paragraph", async () => {
    const path = "/static/exercise_images/0123456789abcdef0123456789abcdef.webp";
    const { getByTestId, getByText, queryByText } = await render(
      <Markdown>{`Start here ![Start position](${path}) then pull.`}</Markdown>
    );

    const image = getByTestId("markdown-image");
    expect(image.props.accessibilityLabel).toBe("Start position");
    expect(JSON.stringify(image.props.source)).toContain(`https://api.test.local${path}`);
    expect(getByText("Start here")).toBeTruthy();
    expect(getByText("then pull.")).toBeTruthy();
    expect(queryByText(/🖼/)).toBeNull();
  });

  it("renders an image-only paragraph without empty text blocks", async () => {
    const path = "/static/exercise_images/0123456789abcdef0123456789abcdef.webp";
    const { getAllByTestId, toJSON } = await render(<Markdown>{`![a](${path})\n![b](${path})`}</Markdown>);

    expect(getAllByTestId("markdown-image")).toHaveLength(2);
    expect(JSON.stringify(toJSON())).not.toMatch(/"children":\["\\n"\]/);
  });

  it("shows raw HTML as literal text", async () => {
    const { getByText } = await render(<Markdown>{"Hello <b>there</b>"}</Markdown>);

    expect(getByText("Hello <b>there</b>")).toBeTruthy();
  });

  it("renders task list markers and code", async () => {
    const { getByText } = await render(<Markdown>{"- [x] warm up\n- [ ] stretch\n\n```\nhold 30s\n```"}</Markdown>);

    expect(getByText("☑")).toBeTruthy();
    expect(getByText("☐")).toBeTruthy();
    expect(getByText("hold 30s")).toBeTruthy();
  });
});
