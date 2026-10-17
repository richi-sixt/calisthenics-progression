import { fireEvent } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import { SkillExerciseRow } from "./SkillExerciseRow";
import type { SkillExercise } from "@/types";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

function make(overrides: Partial<SkillExercise> = {}): SkillExercise {
  return {
    exercise_id: 7,
    title: "Adv. Tuck Planche Hold",
    counting_type: "duration",
    thumbnail_url: null,
    archived: false,
    step_order: 1,
    target_value: 10,
    best: 6,
    reached: false,
    last_done_date: null,
    ...overrides,
  };
}

describe("SkillExerciseRow", () => {
  it("shows best versus target and no checkmark while not reached", async () => {
    const { getByTestId, queryByText } = await renderWithProviders(
      <SkillExerciseRow exercise={make()} index={0} isNext={false} />
    );
    expect(getByTestId("skill-exercise-7-value").props.children.join("")).toContain("6s / 10s");
    expect(queryByText("✓")).toBeNull();
  });

  it("marks a reached exercise with a checkmark", async () => {
    const { getByText } = await renderWithProviders(
      <SkillExerciseRow exercise={make({ best: 12, reached: true })} index={0} isNext={false} />
    );
    expect(getByText("✓")).toBeTruthy();
  });

  it("flags the next step and opens the exercise on press", async () => {
    const { getByText, getByTestId } = await renderWithProviders(
      <SkillExerciseRow exercise={make({ counting_type: "reps", target_value: 8, best: 3 })} index={1} isNext />
    );
    expect(getByText("Next step")).toBeTruthy();
    await fireEvent.press(getByTestId("skill-exercise-7"));
    expect(mockPush).toHaveBeenCalledWith("/exercises/7");
  });

  it("shows the last done date in the locale format used elsewhere in the app", async () => {
    const { getByText } = await renderWithProviders(
      <SkillExerciseRow exercise={make({ last_done_date: "2026-10-17" })} index={0} isNext={false} />
    );
    // "short" format, same as the profile (not the raw ISO date)
    expect(getByText(/Last done Oct 17, 2026/)).toBeTruthy();
  });
});
