import { fireEvent, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { renderWithProviders } from "@/test-utils";
import { ExerciseForm } from "@/components/exercise/ExerciseForm";
import { useCategories } from "@/hooks/use-categories";
import { useExercises } from "@/hooks/use-exercises";
import type { ExerciseDefinition } from "@/types";
import { api } from "@/lib/api";

jest.mock("@/hooks/use-categories", () => ({ useCategories: jest.fn() }));
jest.mock("@/hooks/use-exercises", () => ({ useExercises: jest.fn() }));
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
  (useExercises as jest.Mock).mockReturnValue({
    data: { data: [{ id: 1, title: "Pike" }, { id: 2, title: "Low Pike" }, { id: 3, title: "High Pike" }, { id: 4, title: "Handstand" }] },
  });
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

describe("ExerciseForm thumbnail", () => {
  it("uploads the picked image as thumbnail and submits its filename", async () => {
    const onSubmit = jest.fn();
    const { getByTestId, getByText, getByPlaceholderText, queryByTestId } = await renderWithProviders(
      <ExerciseForm onSubmit={onSubmit} isPending={false} />
    );
    upload.mockResolvedValue({
      data: { id: 2, filename: "0123456789abcdef0123456789abcdef.webp", url: IMAGE_URL },
    });

    expect(queryByTestId("exercise-thumbnail-preview")).toBeNull();
    await fireEvent.press(getByTestId("exercise-set-thumbnail"));
    await waitFor(() => expect(getByTestId("exercise-thumbnail-preview")).toBeTruthy());
    // The thumbnail does not touch the description.
    expect(getByTestId("exercise-description-input").props.value).toBe("");

    await fireEvent.changeText(getByPlaceholderText("e.g. Push-ups"), "Pike Stand");
    await fireEvent.press(getByText("Save Exercise"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({ thumbnail: "0123456789abcdef0123456789abcdef.webp" })
    );
  });

  it("removes the thumbnail", async () => {
    const { getByTestId, queryByTestId } = await renderWithProviders(
      <ExerciseForm
        defaultValues={{ thumbnail: "0123456789abcdef0123456789abcdef.webp" }}
        onSubmit={jest.fn()}
        isPending={false}
      />
    );
    expect(getByTestId("exercise-thumbnail-preview")).toBeTruthy();
    await fireEvent.press(getByTestId("exercise-remove-thumbnail"));
    await waitFor(() => expect(queryByTestId("exercise-thumbnail-preview")).toBeNull());
  });
});

describe("ExerciseForm progressions", () => {
  const pike = {
    id: 1,
    title: "Pike",
    parents: [{ id: 4, title: "Handstand" }],
    progressions: [{ id: 2, title: "Low Pike", step_order: 1, counting_type: "reps", thumbnail_url: null }],
  } as unknown as Partial<ExerciseDefinition>;

  const rowIds = (getAllByTestId: (id: RegExp) => { props: Record<string, any> }[]) =>
    getAllByTestId(/^progression-row-/).map((r) => String(r.props.testID).replace("progression-row-", ""));

  it("offers only exercises that are not itself, a parent or already a step", async () => {
    const { getByTestId, queryByTestId } = await renderWithProviders(
      <ExerciseForm defaultValues={pike} onSubmit={jest.fn()} isPending={false} />
    );
    await fireEvent.press(getByTestId("progression-add"));
    expect(queryByTestId("progression-add-option-3")).toBeTruthy();
    expect(queryByTestId("progression-add-option-1")).toBeNull(); // itself
    expect(queryByTestId("progression-add-option-4")).toBeNull(); // parent (would be a cycle)
    expect(queryByTestId("progression-add-option-2")).toBeNull(); // already a step
  });

  it("adds, reorders and removes steps and submits the ordered ids", async () => {
    const onSubmit = jest.fn();
    const { getByTestId, getAllByTestId, queryByTestId, getByText } = await renderWithProviders(
      <ExerciseForm defaultValues={pike} onSubmit={onSubmit} isPending={false} />
    );

    await fireEvent.press(getByTestId("progression-add"));
    await fireEvent.press(getByTestId("progression-add-option-3"));
    await waitFor(() => expect(rowIds(getAllByTestId)).toEqual(["2", "3"]));

    await fireEvent.press(getByTestId("progression-down-2"));
    await waitFor(() => expect(rowIds(getAllByTestId)).toEqual(["3", "2"]));
    await fireEvent.press(getByTestId("progression-up-2"));
    await waitFor(() => expect(rowIds(getAllByTestId)).toEqual(["2", "3"]));
    await fireEvent.press(getByTestId("progression-up-3"));
    await waitFor(() => expect(rowIds(getAllByTestId)).toEqual(["3", "2"]));

    await fireEvent.press(getByText("Save Exercise"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].progressions.map((p: { id: number }) => p.id)).toEqual([3, 2]);

    await fireEvent.press(getByTestId("progression-remove-3"));
    await waitFor(() => expect(queryByTestId("progression-row-3")).toBeNull());
    expect(rowIds(getAllByTestId)).toEqual(["2"]);
  });
});
