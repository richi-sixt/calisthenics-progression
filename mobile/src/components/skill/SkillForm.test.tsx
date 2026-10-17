import { fireEvent } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import { SkillForm } from "./SkillForm";
import { useExercises } from "@/hooks/use-exercises";
import type { ExerciseDefinition } from "@/types";

jest.mock("@/hooks/use-exercises", () => ({ useExercises: jest.fn() }));

const base = {
  description: null,
  date_created: null,
  user_id: 1,
  username: "me",
  user_image_file: null,
  archived: false,
  visibility: "private" as const,
  progressions: [],
  parents: [],
  skills: [],
  progression_levels: [],
  category_ids: [],
};
const tuck: ExerciseDefinition = { ...base, id: 1, title: "Tuck Planche", counting_type: "duration" };
const run: ExerciseDefinition = { ...base, id: 2, title: "Run", counting_type: "km" };

beforeEach(() => {
  (useExercises as jest.Mock).mockReturnValue({ data: { data: [tuck, run] } });
});

describe("SkillForm", () => {
  it("does not offer km exercises", async () => {
    const { queryByTestId, getByTestId } = await renderWithProviders(
      <SkillForm onSubmit={jest.fn()} isPending={false} />
    );
    expect(getByTestId("skill-add-1")).toBeTruthy();
    expect(queryByTestId("skill-add-2")).toBeNull();
  });

  it("submits title and ordered exercises with targets", async () => {
    const onSubmit = jest.fn();
    const { getByTestId } = await renderWithProviders(<SkillForm onSubmit={onSubmit} isPending={false} />);

    await fireEvent.changeText(getByTestId("skill-title"), "  Planche ");
    await fireEvent.press(getByTestId("skill-add-1"));
    await fireEvent.changeText(getByTestId("skill-target-1"), "15");
    await fireEvent.press(getByTestId("skill-save"));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Planche",
      description: null,
      exercises: [{ exercise_id: 1, target_value: 15 }],
    });
  });

  it("does not submit without a title", async () => {
    const onSubmit = jest.fn();
    const { getByTestId } = await renderWithProviders(<SkillForm onSubmit={onSubmit} isPending={false} />);
    await fireEvent.press(getByTestId("skill-save"));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
