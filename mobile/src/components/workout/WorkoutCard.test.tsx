import { Alert } from "react-native";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import { WorkoutCard } from "@/components/workout/WorkoutCard";
import { api } from "@/lib/api";
import type { Workout } from "@/types";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock("@/lib/api", () => ({
  api: { post: jest.fn(), delete: jest.fn() },
  ApiError: class ApiError extends Error {},
}));

function makeWorkout(overrides: Partial<Workout>): Workout {
  return {
    id: 1,
    title: "Leg day",
    timestamp: null,
    user_id: 1,
    username: "tester",
    user_image_file: null,
    is_template: false,
    is_done: false,
    exercises: [],
    ...overrides,
  } as Workout;
}

describe("WorkoutCard", () => {
  beforeEach(() => {
    (api.post as jest.Mock).mockResolvedValue({ data: {} });
    (api.delete as jest.Mock).mockResolvedValue({ data: { message: "deleted" } });
  });

  it("shows the pending badge and a 'Mark done' button for an unfinished workout", async () => {
    const { getByText, queryByText } = await renderWithProviders(<WorkoutCard workout={makeWorkout({ is_done: false })} />);
    expect(getByText("Leg day")).toBeTruthy();
    expect(getByText("pendent")).toBeTruthy();
    expect(getByText("Mark done")).toBeTruthy();
    expect(queryByText("Done")).toBeNull();
  });

  it("shows the done badge for a finished workout", async () => {
    const { getByText, queryAllByText } = await renderWithProviders(<WorkoutCard workout={makeWorkout({ is_done: true })} />);
    // "Done" appears twice: once as the status badge, once as the (now inert) action button label.
    expect(queryAllByText("Done").length).toBe(2);
  });

  it("calls the toggle-done endpoint when 'Mark done' is pressed", async () => {
    const { getByText } = await renderWithProviders(<WorkoutCard workout={makeWorkout({ id: 42, is_done: false })} />);

    await fireEvent.press(getByText("Mark done"));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/workouts/42/toggle-done"));
  });

  it("deletes the workout after the confirmation alert is accepted", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      const destructive = buttons?.find((b) => b.style === "destructive");
      destructive?.onPress?.();
    });

    const { getByText } = await renderWithProviders(<WorkoutCard workout={makeWorkout({ id: 7 })} />);
    await fireEvent.press(getByText("Delete"));

    expect(alertSpy).toHaveBeenCalled();
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/workouts/7"));
  });
});
