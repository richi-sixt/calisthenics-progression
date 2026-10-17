import { fireEvent } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import CatalogScreen from "@/app/(app)/catalog";
import {
  useCatalogExercises,
  useImportCatalogExercise,
  useCatalogSkills,
  useImportCatalogSkill,
} from "@/hooks/use-catalog";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/hooks/use-catalog", () => ({
  useCatalogExercises: jest.fn(),
  useImportCatalogExercise: jest.fn(),
  useCatalogSkills: jest.fn(),
  useImportCatalogSkill: jest.fn(),
}));

const entry = (id: number, title: string, imported: number | null) => ({
  id,
  title,
  progressions: [],
  imported_exercise_id: imported,
});

describe("CatalogScreen", () => {
  const mutate = jest.fn();

  const skillMutate = jest.fn();

  beforeEach(() => {
    mutate.mockClear();
    skillMutate.mockClear();
    (useImportCatalogSkill as jest.Mock).mockReturnValue({ mutate: skillMutate, isPending: false, variables: undefined });
    (useCatalogSkills as jest.Mock).mockReturnValue({
      data: {
        data: [
          {
            id: 9,
            title: "Planche",
            description: null,
            user_id: 1,
            imported_skill_id: null,
            exercises: [{ exercise_id: 1, title: "Tuck Hold", counting_type: "duration", thumbnail_url: null, step_order: 1, target_value: 10 }],
          },
        ],
      },
      isLoading: false,
      error: null,
    });
    (useImportCatalogExercise as jest.Mock).mockReturnValue({ mutate, isPending: false, variables: undefined });
    (useCatalogExercises as jest.Mock).mockReturnValue({
      data: { data: [entry(1, "Tuck Planche", null), entry(2, "Pike Push-up", 55)], meta: { has_next: false, has_prev: false } },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });
  });

  it("offers import for new entries and marks imported ones", async () => {
    const { getByTestId, queryByTestId } = await renderWithProviders(<CatalogScreen />);
    expect(getByTestId("catalog-import-1")).toBeTruthy();
    expect(queryByTestId("catalog-import-2")).toBeNull();
    expect(getByTestId("catalog-imported-2")).toBeTruthy();
  });

  it("imports an entry on press", async () => {
    const { getByTestId } = await renderWithProviders(<CatalogScreen />);
    await fireEvent.press(getByTestId("catalog-import-1"));
    expect(mutate).toHaveBeenCalledWith(1);
  });

  it("opens the imported copy", async () => {
    const { getByTestId } = await renderWithProviders(<CatalogScreen />);
    await fireEvent.press(getByTestId("catalog-imported-2"));
    expect(mockPush).toHaveBeenCalledWith("/exercises/55");
  });

  it("passes the search text to the query", async () => {
    const { getByTestId } = await renderWithProviders(<CatalogScreen />);
    await fireEvent.changeText(getByTestId("catalog-search"), "planche");
    expect(useCatalogExercises).toHaveBeenLastCalledWith(1, "planche");
  });

  it("lists library skills with targets and imports one", async () => {
    const { getByTestId, getByText } = await renderWithProviders(<CatalogScreen />);
    await fireEvent.press(getByTestId("catalog-tab-skills"));
    expect(getByText("Planche")).toBeTruthy();
    expect(getByText("1. Tuck Hold (10s)")).toBeTruthy();
    await fireEvent.press(getByTestId("catalog-skill-import-9"));
    expect(skillMutate).toHaveBeenCalledWith(9);
  });
});
