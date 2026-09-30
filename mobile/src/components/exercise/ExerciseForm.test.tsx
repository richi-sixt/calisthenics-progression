import { fireEvent, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { renderWithProviders } from "@/test-utils";
import { ExerciseForm } from "@/components/exercise/ExerciseForm";
import { useCategories } from "@/hooks/use-categories";
import { api } from "@/lib/api";

jest.mock("@/hooks/use-categories", () => ({ useCategories: jest.fn() }));
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("@/lib/api", () => ({
  api: { upload: jest.fn() },
  ApiError: class ApiError extends Error {},
}));

const IMAGE_URL = "/static/exercise_images/0123456789abcdef0123456789abcdef.webp";
const pickImage = ImagePicker.launchImageLibraryAsync as jest.Mock;
const upload = api.upload as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (useCategories as jest.Mock).mockReturnValue({ data: { data: [] } });
  global.fetch = jest.fn().mockResolvedValue({ blob: async () => new Blob(["img"]) }) as unknown as typeof fetch;
  pickImage.mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///photo.jpg", fileName: "photo.jpg", fileSize: 1000, width: 10, height: 10 }],
  });
  upload.mockResolvedValue({ data: { id: 1, filename: "x.webp", url: IMAGE_URL } });
});

function renderForm(description = "") {
  return renderWithProviders(
    <ExerciseForm defaultValues={{ description }} onSubmit={jest.fn()} isPending={false} />
  );
}

describe("ExerciseForm image upload", () => {
  it("uploads the picked image and inserts it at the cursor", async () => {
    const { getByTestId } = await renderForm("Hang.\n\nPull.");
    const input = getByTestId("exercise-description-input");

    await fireEvent(input, "selectionChange", { nativeEvent: { selection: { start: 5, end: 5 } } });
    await fireEvent.press(getByTestId("exercise-add-image"));

    await waitFor(() =>
      expect(getByTestId("exercise-description-input").props.value).toBe(
        `Hang.\n\n![Image](${IMAGE_URL})\n\nPull.`
      )
    );
    expect(upload).toHaveBeenCalledWith("/uploads/images", expect.anything(), "POST");
  });

  it("appends at the end when the field was never focused", async () => {
    const { getByTestId } = await renderForm("Hang.");

    await fireEvent.press(getByTestId("exercise-add-image"));

    await waitFor(() =>
      expect(getByTestId("exercise-description-input").props.value).toBe(`Hang.\n\n![Image](${IMAGE_URL})\n\n`)
    );
  });

  it("does nothing when the picker is cancelled", async () => {
    pickImage.mockResolvedValue({ canceled: true, assets: null });
    const { getByTestId } = await renderForm("Hang.");

    await fireEvent.press(getByTestId("exercise-add-image"));

    expect(upload).not.toHaveBeenCalled();
    expect(getByTestId("exercise-description-input").props.value).toBe("Hang.");
  });

  it("rejects files over 10 MB before uploading", async () => {
    pickImage.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///big.jpg", fileName: "big.jpg", fileSize: 11 * 1024 * 1024, width: 10, height: 10 }],
    });
    const { getByTestId } = await renderForm();

    await fireEvent.press(getByTestId("exercise-add-image"));

    await waitFor(() => expect(getByTestId("exercise-image-error")).toBeTruthy());
    expect(upload).not.toHaveBeenCalled();
  });

  it("shows the server's error message when the upload fails", async () => {
    upload.mockRejectedValue(new Error("Unsupported image type. Use JPEG, PNG, WebP or GIF."));
    const { getByTestId } = await renderForm("Hang.");

    await fireEvent.press(getByTestId("exercise-add-image"));

    await waitFor(() =>
      expect(getByTestId("exercise-image-error").props.children).toContain("Unsupported image type")
    );
    expect(getByTestId("exercise-description-input").props.value).toBe("Hang.");
  });
});
