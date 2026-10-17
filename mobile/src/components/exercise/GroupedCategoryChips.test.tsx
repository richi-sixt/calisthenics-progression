import { fireEvent } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import GroupedCategoryChips from "./GroupedCategoryChips";
import { useCategories, useCategoryGroups } from "@/hooks/use-categories";

jest.mock("@/hooks/use-categories", () => ({
  useCategories: jest.fn(),
  useCategoryGroups: jest.fn(),
}));

describe("GroupedCategoryChips", () => {
  beforeEach(() => {
    (useCategories as jest.Mock).mockReturnValue({
      data: {
        data: [
          { id: 1, name: "Cardio", group_id: 10 },
          { id: 2, name: "Back", group_id: 11 },
          { id: 3, name: "Rings", group_id: null },
        ],
      },
    });
    (useCategoryGroups as jest.Mock).mockReturnValue({
      data: {
        data: [
          { id: 10, name: "Workout-Art", sort_order: 0 },
          { id: 11, name: "Körperteile", sort_order: 1 },
        ],
      },
    });
  });

  it("renders a titled section per group plus ungrouped categories", async () => {
    const { getByText } = await renderWithProviders(
      <GroupedCategoryChips selectedIds={[]} onChange={jest.fn()} />
    );
    expect(getByText("Workout-Art")).toBeTruthy();
    expect(getByText("Körperteile")).toBeTruthy();
    expect(getByText("Cardio")).toBeTruthy();
    expect(getByText("Rings")).toBeTruthy();
  });

  it("toggles a category", async () => {
    const onChange = jest.fn();
    const { getByText } = await renderWithProviders(
      <GroupedCategoryChips selectedIds={[2]} onChange={onChange} />
    );
    await fireEvent.press(getByText("Cardio"));
    expect(onChange).toHaveBeenCalledWith([2, 1]);
    await fireEvent.press(getByText("Back"));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
