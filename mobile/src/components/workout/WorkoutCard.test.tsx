import { Alert } from "react-native";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { format } from "date-fns";
import { renderWithProviders } from "@/test-utils";
import { WorkoutCard } from "@/components/workout/WorkoutCard";
import { api } from "@/lib/api";
import type { Workout } from "@/types";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock("@/lib/api", () => ({
  api: { post: jest.fn(), put: jest.fn(), delete: jest.fn() },
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
    visibility: "followers",
    planned_date: null,
    exercises: [],
    ...overrides,
  } as Workout;
}

describe("WorkoutCard", () => {
  beforeEach(() => {
    (api.post as jest.Mock).mockResolvedValue({ data: {} });
    (api.put as jest.Mock).mockResolvedValue({ data: {} });
    (api.delete as jest.Mock).mockResolvedValue({ data: { message: "deleted" } });
  });

  it("shows a public badge for a public workout", async () => {
    const { getAllByText } = await renderWithProviders(
      <WorkoutCard workout={makeWorkout({ visibility: "public" })} />
    );
    // "Public" appears both as the status badge and as a visibility option label.
    expect(getAllByText("Public").length).toBeGreaterThanOrEqual(2);
  });

  it("calls the update endpoint with the tapped visibility option", async () => {
    const { getByTestId } = await renderWithProviders(
      <WorkoutCard workout={makeWorkout({ id: 42, visibility: "followers" })} />
    );

    await fireEvent.press(getByTestId("visibility-option-42-public"));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/workouts/42", { visibility: "public" })
    );
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

  it("shows a 'Planned for' badge for a future, not-yet-done workout", async () => {
    const future = format(new Date(Date.now() + 10 * 86400000), "yyyy-MM-dd");
    const { getByText } = await renderWithProviders(
      <WorkoutCard workout={makeWorkout({ planned_date: future, is_done: false })} />
    );
    expect(getByText(/Planned for/)).toBeTruthy();
  });

  it("does not show a 'Planned for' badge once the workout is done", async () => {
    const future = format(new Date(Date.now() + 10 * 86400000), "yyyy-MM-dd");
    const { queryByText } = await renderWithProviders(
      <WorkoutCard workout={makeWorkout({ planned_date: future, is_done: true })} />
    );
    expect(queryByText(/Planned for/)).toBeNull();
  });

  it("does not show a 'Planned for' badge for a past or today date", async () => {
    const todayIso = format(new Date(), "yyyy-MM-dd");
    const { queryByText } = await renderWithProviders(
      <WorkoutCard workout={makeWorkout({ planned_date: todayIso, is_done: false })} />
    );
    expect(queryByText(/Planned for/)).toBeNull();
  });

  it("re-plans a workout by picking a day from the calendar modal", async () => {
    const { getByTestId, queryByTestId } = await renderWithProviders(
      <WorkoutCard workout={makeWorkout({ id: 42 })} />
    );

    await fireEvent.press(getByTestId("replan-button-42"));
    expect(getByTestId("month-calendar")).toBeTruthy();

    const firstOfMonth = format(new Date(), "yyyy-MM") + "-01";
    await fireEvent.press(getByTestId(`calendar-day-${firstOfMonth}`));

    expect(queryByTestId("month-calendar")).toBeNull();
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/workouts/42", { planned_date: firstOfMonth })
    );
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
