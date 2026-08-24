import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import { WorkoutForm } from "@/components/workout/WorkoutForm";
import { useExercises } from "@/hooks/use-exercises";
import { useCategories } from "@/hooks/use-categories";
import type { ExerciseDefinition, Workout } from "@/types";

jest.mock("@/hooks/use-exercises", () => ({ useExercises: jest.fn() }));
jest.mock("@/hooks/use-categories", () => ({ useCategories: jest.fn() }));

const pushUp: ExerciseDefinition = {
  id: 1,
  title: "Push-Up",
  description: null,
  counting_type: "reps",
  date_created: null,
  user_id: 1,
  username: "tester",
  user_image_file: null,
  archived: false,
  progression_levels: [],
  category_ids: [],
};

const plank: ExerciseDefinition = {
  id: 2,
  title: "Plank",
  description: null,
  counting_type: "duration",
  date_created: null,
  user_id: 1,
  username: "tester",
  user_image_file: null,
  archived: false,
  progression_levels: [{ id: 10, name: "Standard", level_order: 1 }],
  category_ids: [],
};

beforeEach(() => {
  (useExercises as jest.Mock).mockReturnValue({ data: { data: [pushUp, plank] } });
  (useCategories as jest.Mock).mockReturnValue({ data: { data: [] } });
});

function renderForm(defaultValues?: Partial<Workout>) {
  return renderWithProviders(
    <WorkoutForm defaultValues={defaultValues} onSubmit={jest.fn()} isPending={false} />
  );
}

async function selectExercise(
  getByTestId: Awaited<ReturnType<typeof renderWithProviders>>["getByTestId"],
  exIndex: number,
  def: ExerciseDefinition
) {
  await fireEvent.press(getByTestId(`exercise-picker-${exIndex}`));
  await fireEvent.press(getByTestId(`exercise-picker-${exIndex}-option-${def.id}`));
}

describe("WorkoutForm", () => {
  it("converts stored numbers (seconds, reps) into the form's string fields", async () => {
    const defaultValues: Partial<Workout> = {
      title: "Leg Day",
      exercises: [
        {
          id: 100,
          exercise_order: 1,
          workout_id: 1,
          exercise_definition_id: 1,
          exercise_definition_title: "Push-Up",
          counting_type: "reps",
          sets: [{ id: 1, set_order: 1, progression: null, reps: 12, duration: null, duration_formatted: "0:00" }],
        },
        {
          id: 101,
          exercise_order: 2,
          workout_id: 1,
          exercise_definition_id: 2,
          exercise_definition_title: "Plank",
          counting_type: "duration",
          sets: [{ id: 2, set_order: 1, progression: "Standard", reps: null, duration: 125, duration_formatted: "2:05" }],
        },
      ],
    };

    const { getByPlaceholderText, getByTestId } = await renderForm(defaultValues);

    expect(getByPlaceholderText("Workout title").props.value).toBe("Leg Day");
    expect(getByTestId("reps-0-0").props.value).toBe("12");
    // 125 seconds -> "2:05"
    expect(getByTestId("duration-1-0").props.value).toBe("2:05");
  });

  it("adds and removes exercise blocks", async () => {
    const { getByText, getByTestId, queryByTestId } = await renderForm();

    expect(queryByTestId("exercise-picker-0")).toBeTruthy();
    expect(queryByTestId("exercise-picker-1")).toBeNull();

    await fireEvent.press(getByText("+ Add exercise"));
    await fireEvent.press(getByText("+ Add exercise"));
    expect(queryByTestId("exercise-picker-0")).toBeTruthy();
    expect(queryByTestId("exercise-picker-1")).toBeTruthy();
    expect(queryByTestId("exercise-picker-2")).toBeTruthy();

    await fireEvent.press(getByTestId("exercise-remove-1"));
    expect(queryByTestId("exercise-picker-0")).toBeTruthy();
    expect(queryByTestId("exercise-picker-1")).toBeTruthy();
    expect(queryByTestId("exercise-picker-2")).toBeNull();
  });

  it("adds and removes sets within a single exercise", async () => {
    const { getByTestId, queryByTestId } = await renderForm();

    expect(queryByTestId("set-remove-0-1")).toBeNull();

    await fireEvent.press(getByTestId("add-set-0"));
    expect(queryByTestId("set-remove-0-1")).toBeTruthy();

    await fireEvent.press(getByTestId("set-remove-0-1"));
    expect(queryByTestId("set-remove-0-1")).toBeNull();
  });

  it("switches the reps/duration field and shows a progression picker based on the selected exercise", async () => {
    const { getByTestId, queryByTestId } = await renderForm();

    // No exercise selected yet -> defaults to a reps field, freeform progression text input.
    expect(queryByTestId("reps-0-0")).toBeTruthy();
    expect(queryByTestId("duration-0-0")).toBeNull();
    expect(queryByTestId("progression-input-0-0")).toBeTruthy();
    expect(queryByTestId("progression-chips-0-0")).toBeNull();

    await selectExercise(getByTestId, 0, plank);

    await waitFor(() => expect(queryByTestId("duration-0-0")).toBeTruthy());
    expect(queryByTestId("reps-0-0")).toBeNull();
    // Plank has progression levels, so the freeform text input is replaced by chips.
    expect(queryByTestId("progression-chips-0-0")).toBeTruthy();
    expect(queryByTestId("progression-input-0-0")).toBeNull();
  });

  it("selects a progression level by tapping its chip", async () => {
    const onSubmit = jest.fn();
    const { getByPlaceholderText, getByTestId, getByText } = await renderWithProviders(
      <WorkoutForm onSubmit={onSubmit} isPending={false} />
    );

    await fireEvent.changeText(getByPlaceholderText("Workout title"), "Plank Day");
    await selectExercise(getByTestId, 0, plank);
    await waitFor(() => expect(getByTestId("progression-chips-0-0")).toBeTruthy());

    await fireEvent.press(getByTestId("progression-chip-0-0-10"));
    await fireEvent.changeText(getByTestId("duration-0-0"), "0:30");
    await fireEvent.press(getByText("Save"));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          exercises: [expect.objectContaining({ sets: [expect.objectContaining({ progression: "Standard" })] })],
        })
      )
    );
  });

  it("submits title/exercises with strings converted back to numbers and blanks to null", async () => {
    const onSubmit = jest.fn();
    const { getByPlaceholderText, getByTestId, getByText } = await renderWithProviders(
      <WorkoutForm onSubmit={onSubmit} isPending={false} />
    );

    await fireEvent.changeText(getByPlaceholderText("Workout title"), "New Workout");
    await selectExercise(getByTestId, 0, pushUp);
    await fireEvent.changeText(getByTestId("reps-0-0"), "10");
    await fireEvent.press(getByText("Save"));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: "New Workout",
        exercises: [
          {
            exercise_definition_id: pushUp.id,
            sets: [{ progression: null, reps: 10, duration: null }],
          },
        ],
      })
    );
  });

  it("converts a mm:ss duration back to seconds on submit", async () => {
    const onSubmit = jest.fn();
    const { getByPlaceholderText, getByTestId, getByText } = await renderWithProviders(
      <WorkoutForm onSubmit={onSubmit} isPending={false} />
    );

    await fireEvent.changeText(getByPlaceholderText("Workout title"), "Plank Day");
    await selectExercise(getByTestId, 0, plank);
    await waitFor(() => expect(getByTestId("duration-0-0")).toBeTruthy());
    await fireEvent.changeText(getByTestId("duration-0-0"), "2:05");
    await fireEvent.press(getByText("Save"));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          exercises: [expect.objectContaining({ sets: [expect.objectContaining({ duration: 125 })] })],
        })
      )
    );
  });
});
